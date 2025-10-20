// routes/admin.js - LOCAL VERSION
const express = require('express');
const router = express.Router();
const pool = require('../config/db');

// Middleware to allow only admin
router.use((req, res, next) => {
    const user = req.session.user;
    if (!user || !user.is_admin) return res.status(403).json({ error: 'Forbidden' });
    next();
});

// Get all pending projects
router.get('/projects', async (req, res) => {
    try {
        const [projects] = await pool.query(
            'SELECT p.*, u.name AS owner_name FROM projects p JOIN users u ON p.user_id = u.id WHERE p.status="pending" ORDER BY p.created_at DESC'
        );
        res.json(projects);
    } catch (err) {
        console.error("Database error fetching pending projects:", err);
        res.status(500).json({ error: 'Server error: Could not fetch pending projects' });
    }
});

// Approve a project
router.post('/projects/approve', async (req, res) => {
    const { projectId } = req.body;
    try {
        const [[project]] = await pool.query('SELECT user_id, title FROM projects WHERE id = ?', [projectId]);
        if (!project) return res.status(404).json({ error: 'Project not found' });

        await pool.query('UPDATE projects SET status="approved" WHERE id=?', [projectId]);

        await pool.query(
            'INSERT INTO notifications (user_id, type, message, link) VALUES (?, ?, ?, ?)',
            [
                project.user_id,
                'approval_success',
                `Your project "${project.title}" has been approved and is now live!`,
                `/project.html?id=${projectId}`
            ]
        );

        res.json({ ok: true, message: 'Project approved and owner notified' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Reject a project
router.post('/projects/reject', async (req, res) => {
    const { projectId } = req.body;
    try {
        const [[project]] = await pool.query('SELECT user_id, title FROM projects WHERE id = ?', [projectId]);
        if (!project) return res.status(404).json({ error: 'Project not found' });

        await pool.query('UPDATE projects SET status="rejected" WHERE id=?', [projectId]);

        await pool.query(
            'INSERT INTO notifications (user_id, type, message, link) VALUES (?, ?, ?, ?)',
            [
                project.user_id,
                'approval_rejected',
                `Your project "${project.title}" was reviewed and rejected by the Admin.`,
                `/profile.html`
            ]
        );

        res.json({ ok: true, message: 'Project rejected and owner notified' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
