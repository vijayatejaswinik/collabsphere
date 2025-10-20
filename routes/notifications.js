const express = require('express');
const router = express.Router();
const pool = require('../config/db');

// Get all notifications for logged-in user
router.get('/', async (req, res) => {
  if (!req.session.user) return res.status(401).json({ error: 'Unauthorized' });
  const userId = req.session.user.id;

  try {
    const [notifications] = await pool.query(
      'SELECT id, message, type, link, is_read, created_at FROM notifications WHERE user_id = ? ORDER BY created_at DESC',
      [userId]
    );
    return res.status(200).json(notifications);
  } catch (err) {
    console.error('Error fetching notifications:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// Mark a notification as read
router.post('/read', async (req, res) => {
  const { notificationId } = req.body;
  if (!req.session.user) return res.status(401).json({ error: 'Unauthorized' });

  try {
    await pool.query(
      'UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?',
      [notificationId, req.session.user.id]
    );
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Error marking notification as read:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// Admin: get pending project count
router.get('/admin/count', async (req, res) => {
  if (!req.session.user || !req.session.user.is_admin)
    return res.status(403).json({ error: 'Forbidden' });

  try {
    const [[row]] = await pool.query(
      'SELECT COUNT(*) AS pendingCount FROM projects WHERE status = "pending"'
    );
    return res.status(200).json({ pendingCount: row.pendingCount });
  } catch (err) {
    console.error('Error fetching admin count:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
