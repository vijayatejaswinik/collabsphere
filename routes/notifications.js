const express = require('express');
const router = express.Router();
const pool = require('../config/db');

// Get unread notifications
router.get('/', async (req, res) => {
  if (!req.session.user) return res.status(401).json({ error: 'Unauthorized' });
  const userId = req.session.user.id;

  try {
    const [notifications] = await pool.query(
      'SELECT id, message, type, link, is_read, created_at FROM notifications WHERE user_id = ? ORDER BY created_at DESC',
      [userId]
    );
    res.json(notifications);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Mark as read
router.post('/read', async (req, res) => {
  const { notificationId } = req.body;
  if (!req.session.user) return res.status(401).json({ error: 'Unauthorized' });

  try {
    await pool.query('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?', [notificationId, req.session.user.id]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Admin pending count
router.get('/admin/count', async (req, res) => {
  if (!req.session.user || !req.session.user.is_admin) return res.status(403).json({ error: 'Forbidden' });
  const [[row]] = await pool.query('SELECT COUNT(*) AS pendingCount FROM projects WHERE status = "pending"');
  res.json({ pendingCount: row.pendingCount });
});

module.exports = router;
