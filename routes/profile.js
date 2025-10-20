const express = require('express');
const router = express.Router();
const pool = require('../config/db');

// Get logged-in user profile
router.get('api/profile/me', async (req, res) => {
  if (!req.session.user) {
    console.log('❌ No session user');
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const [[user]] = await pool.query(
      'SELECT id, name, email, bio, portfolio, whatsapp, gender, age, created_at FROM users WHERE id = ?',
      [req.session.user.id]
    );
    return res.status(200).json(user || {});
  } catch (err) {
    console.error('Error fetching profile:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// Update profile
router.post('/update', async (req, res) => {
  if (!req.session.user) {
    console.log('❌ No session user during update');
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { name, bio, portfolio, whatsapp, gender, age } = req.body;
  console.log('📝 Updating user:', req.session.user.id, req.body);

  if (!name) return res.status(400).json({ error: 'Full Name is required.' });

  try {
    await pool.query(
      'UPDATE users SET name=?, bio=?, portfolio=?, whatsapp=?, gender=?, age=? WHERE id=?',
      [name, bio, portfolio, whatsapp, gender, age, req.session.user.id]
    );
    return res.status(200).json({ message: 'Profile updated successfully!' });
  } catch (err) {
    console.error('Error updating profile:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
