// routes/auth.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const pool = require('../config/db');
const { sendOtpEmail } = require('./email');

// ✅ REGISTER (with OTP)
router.post('/register', async (req, res) => {
    const { name, email, password } = req.body;
    if (!name || !email || !password)
        return res.status(400).json({ error: 'Missing fields' });

    try {
        const [exists] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
        if (exists.length)
            return res.status(400).json({ error: 'Email already exists' });

        const hashed = await bcrypt.hash(password, 10);
        const isAdminFlag =
            process.env.ADMIN_EMAIL &&
            process.env.ADMIN_EMAIL.toLowerCase() === email.toLowerCase()
                ? 1
                : 0;

        const [result] = await pool.query(
            'INSERT INTO users (name, email, password, is_admin) VALUES (?, ?, ?, ?)',
            [name, email, hashed, isAdminFlag]
        );

        const userId = result.insertId;

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

        await pool.query('INSERT INTO otps (user_id, code, expires_at) VALUES (?, ?, ?)', [
            userId,
            otp,
            expiresAt
        ]);

        try {
            await sendOtpEmail(email, otp);
        } catch (mailErr) {
            console.error('Email send failed:', mailErr.message);
        }

        res.json({ ok: true, userId, message: 'Registered successfully! Please verify OTP.' });
    } catch (err) {
        console.error('Register error:', err);
        res.status(500).json({ error: 'Server error during registration' });
    }
});

// ✅ VERIFY OTP
router.post('/verify-otp', async (req, res) => {
    const { userId, otp } = req.body;

    try {
        const [rows] = await pool.query(
            'SELECT * FROM otps WHERE user_id = ? AND code = ? AND expires_at > NOW()',
            [userId, otp]
        );

        if (!rows.length)
            return res.status(400).json({ error: 'Invalid or expired OTP' });

        await pool.query('DELETE FROM otps WHERE user_id = ?', [userId]);
        res.json({ ok: true, message: 'OTP verified successfully!' });
    } catch (err) {
        console.error('OTP verify error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// ✅ LOGIN
router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
        if (!rows.length)
            return res.status(400).json({ error: 'Invalid email or password' });

        const user = rows[0];
        const match = await bcrypt.compare(password, user.password);
        if (!match)
            return res.status(400).json({ error: 'Invalid email or password' });

        // ✅ Save session
        req.session.user = {
            id: user.id,
            name: user.name,
            email: user.email,
            is_admin: user.is_admin
        };

        console.log('✅ Session set:', req.session.user);
        res.json({ ok: true, isAdmin: user.is_admin });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// ✅ LOGOUT
router.post('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            console.error('Logout error:', err);
            return res.status(500).json({ error: 'Logout failed' });
        }
        // 👇 CORRECTED: Use the configured session key 'collabsphere.sid'
        res.clearCookie('collabsphere.sid'); 
        res.json({ ok: true, message: 'Logged out successfully' });
    });
});

module.exports = router;