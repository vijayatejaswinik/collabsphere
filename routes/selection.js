const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const axios = require('axios');
axios.defaults.withCredentials = true;


// Require login
router.use((req, res, next) => {
  if (!req.session.user) return res.status(401).json({ error: 'Unauthorized' });
  next();
});

// ✅ Select applicant
router.post('/select', async (req, res) => {
  const { projectId, applicantId } = req.body;
  const user = req.session.user;

  try {
    const [[project]] = await pool.query('SELECT title, user_id FROM projects WHERE id = ?', [projectId]);
    if (!project) return res.status(404).json({ error: 'Project not found' });
    if (project.user_id !== user.id && !user.is_admin) return res.status(403).json({ error: 'Forbidden' });

    await pool.query('UPDATE applications SET status = ? WHERE project_id = ? AND user_id = ?', ['accepted', projectId, applicantId]);
    await pool.query('INSERT IGNORE INTO project_members (project_id, user_id, status) VALUES (?, ?, ?)', [projectId, applicantId, 'selected']);

    await pool.query(
      'INSERT INTO notifications (user_id, type, message, link) VALUES (?, ?, ?, ?)',
      [
        applicantId,
        'application_accepted',
        `🎉 You’ve been selected for "${project.title}"!`,
        `/project.html?id=${projectId}`
      ]
    );

    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ❌ Reject applicant
router.post('/reject-applicant', async (req, res) => {
  const { projectId, applicantId } = req.body;
  const user = req.session.user;

  try {
    const [[project]] = await pool.query('SELECT title, user_id FROM projects WHERE id = ?', [projectId]);
    if (!project) return res.status(404).json({ error: 'Project not found' });
    if (project.user_id !== user.id && !user.is_admin) return res.status(403).json({ error: 'Forbidden' });

    await pool.query('UPDATE applications SET status = ? WHERE project_id = ? AND user_id = ?', ['rejected', projectId, applicantId]);

    await pool.query(
      'INSERT INTO notifications (user_id, type, message, link) VALUES (?, ?, ?, ?)',
      [
        applicantId,
        'application_rejected',
        `❌ Your application for "${project.title}" was not selected.`,
        `/profile.html`
      ]
    );

    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
