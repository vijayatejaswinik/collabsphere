const express = require('express');
const router = express.Router();
const pool = require('../config/db');

// Require login for all routes
router.use((req, res, next) => {
    if (!req.session.user) return res.status(401).json({ error: 'Unauthorized' });
    next();
});

// Select applicant
router.post('/select', async (req, res) => {
    const projectId = Number(req.body.projectId);
    const applicantId = Number(req.body.applicantId);
    const user = req.session.user;

    try {
        const [rows] = await pool.query('SELECT title, user_id FROM projects WHERE id = ?', [projectId]);
        const project = rows[0];
        if (!project) return res.status(404).json({ error: 'Project not found' });
        if (project.user_id !== user.id && Number(user.is_admin) !== 1) return res.status(403).json({ error: 'Forbidden' });

        const [result] = await pool.query(
            'UPDATE applications SET status = ? WHERE project_id = ? AND user_id = ?',
            ['accepted', projectId, applicantId]
        );
        if (result.affectedRows === 0) return res.status(400).json({ error: 'Application not found or already processed' });

        // Add to members
        await pool.query(
            'INSERT IGNORE INTO project_members (project_id, user_id, status) VALUES (?, ?, ?)',
            [projectId, applicantId, 'selected']
        );

        // Notify applicant
        await pool.query(
            'INSERT INTO notifications (user_id, type, message, link) VALUES (?, ?, ?, ?)',
            [applicantId, 'application_accepted', `🎉 You’ve been selected for "${project.title}"!`, `/project.html?id=${projectId}`]
        );

        return res.status(200).json({ ok: true, message: 'Applicant selected successfully' });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Server error' });
    }
});

// Reject applicant
router.post('/reject-applicant', async (req, res) => {
    const projectId = Number(req.body.projectId);
    const applicantId = Number(req.body.applicantId);
    const user = req.session.user;

    try {
        const [rows] = await pool.query('SELECT title, user_id FROM projects WHERE id = ?', [projectId]);
        const project = rows[0];
        if (!project) return res.status(404).json({ error: 'Project not found' });
        if (project.user_id !== user.id && Number(user.is_admin) !== 1) return res.status(403).json({ error: 'Forbidden' });

        const [result] = await pool.query(
            'UPDATE applications SET status = ? WHERE project_id = ? AND user_id = ?',
            ['rejected', projectId, applicantId]
        );
        if (result.affectedRows === 0) return res.status(400).json({ error: 'Application not found or already processed' });

        // Notify applicant
        await pool.query(
            'INSERT INTO notifications (user_id, type, message, link) VALUES (?, ?, ?, ?)',
            [applicantId, 'application_rejected', `❌ Your application for "${project.title}" was not selected.`, `/profile.html`]
        );

        return res.status(200).json({ ok: true, message: 'Applicant rejected successfully' });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
