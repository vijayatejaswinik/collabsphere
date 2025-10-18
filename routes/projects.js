// routes/projects.js - FINAL VERSION
const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const axios = require('axios');
axios.defaults.withCredentials = true;


// --- Helper function to get Admin ID (assuming one admin for simplicity, ID 1) ---
const getAdminId = async () => {
    // In a real app, you would fetch all users WHERE is_admin = 1
    // For this setup, we'll hardcode or look up the first admin:
    const [[admin]] = await pool.query('SELECT id FROM users WHERE is_admin = 1 LIMIT 1');
    return admin ? admin.id : null;
};

// Create a project (Gig)
router.post('/create', async (req, res) => {
  if (!req.session.user) return res.status(401).json({ error: 'Unauthorized' });
  const user = req.session.user;
  const { title, description, required_people, deadline, amount } = req.body;
  if (!title || !description || !required_people) return res.status(400).json({ error: 'Missing fields' });

  try {
    const [r] = await pool.query(
      'INSERT INTO projects (user_id, title, description, required_people, deadline, amount, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [user.id, title, description, required_people, deadline || null, amount || 0, 'pending']
    );
    
    const projectId = r.insertId;
    
    // 🔔 Notify Admin about the new project
    const adminId = await getAdminId();
    if (adminId) {
        await pool.query(
            'INSERT INTO notifications (user_id, type, message, link) VALUES (?, ?, ?, ?)',
            [adminId, 'new_project', `A new project, "${title}", requires your approval.`, `/admin.html`] 
        );
    }
    
    res.json({ ok: true, projectId: projectId, message: 'Project submitted for admin approval' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get all approved projects (list) - NOTE: 'approved' and 'closed' projects are listed
router.get('/all', async (req, res) => {
  try {
    const [projects] = await pool.query(
      `SELECT 
         p.*, 
         u.name AS owner_name, 
         u.email AS owner_email,
         u.whatsapp AS owner_whatsapp
       FROM projects p 
       JOIN users u ON p.user_id = u.id 
       WHERE p.status IN (?, ?) 
       ORDER BY p.created_at DESC`,
      ['approved', 'closed']
    );
    res.json(projects);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});


// Get single project details by id
router.get('/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ error: 'Invalid project id' });

  try {
    const [[project]] = await pool.query(
      'SELECT p.*, u.name AS owner_name, u.email AS owner_email FROM projects p JOIN users u ON p.user_id = u.id WHERE p.id = ?',
      [id]
    );
    if (!project) return res.status(404).json({ error: 'Project not found' });

    const [feedbacks] = await pool.query(
      'SELECT f.*, u.name AS from_name FROM feedbacks f JOIN users u ON f.user_id = u.id WHERE f.project_id = ? ORDER BY f.created_at DESC',
      [id]
    );

    const [[appCounts]] = await pool.query(
      'SELECT COUNT(*) AS count FROM applications WHERE project_id = ?',
      [id]
    );
    
    // Fetch Selected Members
    const [selectedMembers] = await pool.query(
        'SELECT m.user_id, u.name, u.email FROM project_members m JOIN users u ON m.user_id = u.id WHERE m.project_id = ?',
        [id]
    );

    // Get current user's application status (if logged in)
    let myApplicationStatus = null;
    if (req.session.user) {
        const [[myApp]] = await pool.query('SELECT status FROM applications WHERE project_id = ? AND user_id = ?', [id, req.session.user.id]);
        if (myApp) myApplicationStatus = myApp.status;
    }

    res.json({ 
        project, 
        feedbacks, 
        applicantsCount: appCounts.count, 
        selectedMembers, 
        myApplicationStatus 
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get applicants for a project (only owner or admin can view)
router.get('/:id/applicants', async (req, res) => {
  if (!req.session.user) return res.status(401).json({ error: 'Unauthorized' });
  const user = req.session.user;
  const projectId = Number(req.params.id);
  try {
    const [[project]] = await pool.query('SELECT * FROM projects WHERE id = ?', [projectId]);
    if (!project) return res.status(404).json({ error: 'Project not found' });

    // only project owner or admin
    if (project.user_id !== user.id && Number(user.is_admin) !== 1) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    // Fetch applicant details and their current status
    const [apps] = await pool.query(
      'SELECT a.status, a.user_id, u.name AS applicant_name, u.email AS applicant_email, u.bio, u.whatsapp, u.portfolio FROM applications a JOIN users u ON a.user_id = u.id WHERE a.project_id = ? ORDER BY a.created_at DESC',
      [projectId]
    );
    res.json({ applicants: apps });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Apply to a project
router.post('/:id/apply', async (req, res) => {
  if (!req.session.user) return res.status(401).json({ error: 'Unauthorized' });
  const user = req.session.user;
  const projectId = Number(req.params.id);

  try {
    const [[project]] = await pool.query('SELECT * FROM projects WHERE id = ?', [projectId]);
    if (!project) return res.status(404).json({ error: 'Project not found' });
    if (project.status !== 'approved') return res.status(400).json({ error: 'Applications are closed for this project.' });

    // Check deadline
    if (project.deadline && new Date(project.deadline) < new Date()) {
        await pool.query('UPDATE projects SET status = "closed" WHERE id = ?', [projectId]);
        return res.status(400).json({ error: 'The application deadline has passed.' });
    }
    
    // check already applied
    const [exists] = await pool.query('SELECT id FROM applications WHERE project_id = ? AND user_id = ?', [projectId, user.id]);
    if (exists.length) return res.status(400).json({ error: 'You have already applied' });

    await pool.query('INSERT INTO applications (project_id, user_id, status) VALUES (?, ?, ?)', [projectId, user.id, 'applied']);
    
    // 🔔 Notify the project owner
    await pool.query(
        'INSERT INTO notifications (user_id, type, message, link) VALUES (?, ?, ?, ?)',
        [
            project.user_id, // Project owner receives notification
            'application',
            `${user.name} applied to your project: ${project.title}.`,
            `/project.html?id=${projectId}` 
        ]
    );

    res.json({ ok: true, message: 'Application submitted. The project creator has been notified.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Submit feedback for a project (No change needed)
router.post('/:id/feedback', async (req, res) => {
  // ... (Original feedback logic remains here)
});


// New: Close applications for a project (Owner only)
router.post('/:id/close', async (req, res) => {
    if (!req.session.user) return res.status(401).json({ error: 'Unauthorized' });
    const userId = req.session.user.id;
    const projectId = Number(req.params.id);

    try {
        const [[project]] = await pool.query('SELECT user_id FROM projects WHERE id = ?', [projectId]);
        if (!project || project.user_id !== userId) {
            return res.status(403).json({ error: 'Forbidden. Only the owner can close applications.' });
        }

        await pool.query('UPDATE projects SET status = "closed" WHERE id = ?', [projectId]);
        
        res.json({ ok: true, message: 'Applications closed successfully. Project status updated.' });
    } catch (err) {
        console.error('Error closing applications:', err);
        res.status(500).json({ error: 'Server error' });
    }
});


module.exports = router;