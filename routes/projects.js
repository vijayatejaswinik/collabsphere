const express = require('express');
const router = express.Router();
const pool = require('../config/db');

// --- Helper function to get Admin ID ---
const getAdminId = async () => {
    const [rows] = await pool.query('SELECT id FROM users WHERE is_admin = 1 LIMIT 1');
    return rows[0] ? rows[0].id : null;
};

// Require login for all routes
router.use((req, res, next) => {
    if (!req.session.user) return res.status(401).json({ error: 'Unauthorized' });
    next();
});

// Create a project
router.post('/create', async (req, res) => {
    const user = req.session.user;
    const { title, description, required_people, deadline, amount } = req.body;

    if (!title || !description || !required_people) 
        return res.status(400).json({ error: 'Missing required fields' });

    try {
        const [r] = await pool.query(
            `INSERT INTO projects 
            (user_id, title, description, required_people, deadline, amount, status) 
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [user.id, title, description, required_people, deadline || null, amount || 0, 'pending']
        );

        const projectId = r.insertId;

        // Notify admin
        const adminId = await getAdminId();
        if (adminId) {
            await pool.query(
                'INSERT INTO notifications (user_id, type, message, link) VALUES (?, ?, ?, ?)',
                [adminId, 'new_project', `A new project "${title}" requires your approval.`, `/admin.html`]
            );
        }

        return res.status(200).json({ ok: true, projectId, message: 'Project submitted for admin approval' });
    } catch (err) {
        console.error('Error creating project:', err);
        return res.status(500).json({ error: 'Server error' });
    }
});

// Get all approved/closed projects
// Get all approved/closed projects with selected members
router.get('/all', async (req, res) => {
    try {
        const [projects] = await pool.query(
            `SELECT 
                p.*, u.name AS owner_name, u.email AS owner_email, u.whatsapp AS owner_whatsapp 
            FROM projects p 
            JOIN users u ON p.user_id = u.id 
            WHERE p.status IN (?, ?) 
            ORDER BY p.created_at DESC`,
            ['approved', 'closed']
        );

        // Fetch selected members for each project
        for (let p of projects) {
            const [members] = await pool.query(
                'SELECT m.user_id, u.name FROM project_members m JOIN users u ON m.user_id = u.id WHERE m.project_id = ?',
                [p.id]
            );
            p.selectedMembers = members; // attach members to project
        }

        return res.status(200).json(projects);
    } catch (err) {
        console.error('Error fetching projects:', err);
        return res.status(500).json({ error: 'Server error' });
    }
});


// Get single project details
router.get('/:id', async (req, res) => {
    const projectId = Number(req.params.id);
    if (!projectId) return res.status(400).json({ error: 'Invalid project id' });

    try {
        const [projectRows] = await pool.query(
            `SELECT p.*, u.name AS owner_name, u.email AS owner_email 
            FROM projects p JOIN users u ON p.user_id = u.id WHERE p.id = ?`,
            [projectId]
        );
        const project = projectRows[0];
        if (!project) return res.status(404).json({ error: 'Project not found' });

        const [feedbacks] = await pool.query(
            'SELECT f.*, u.name AS from_name FROM feedbacks f JOIN users u ON f.user_id = u.id WHERE f.project_id = ? ORDER BY f.created_at DESC',
            [projectId]
        );

        const [appCountsRows] = await pool.query(
            'SELECT COUNT(*) AS count FROM applications WHERE project_id = ?',
            [projectId]
        );

        const [selectedMembers] = await pool.query(
            'SELECT m.user_id, u.name, u.email FROM project_members m JOIN users u ON m.user_id = u.id WHERE m.project_id = ?',
            [projectId]
        );

        let myApplicationStatus = null;
        if (req.session.user) {
            const [myAppRows] = await pool.query(
                'SELECT status FROM applications WHERE project_id = ? AND user_id = ?',
                [projectId, req.session.user.id]
            );
            if (myAppRows[0]) myApplicationStatus = myAppRows[0].status;
        }

        return res.status(200).json({ 
            project, 
            feedbacks, 
            applicantsCount: appCountsRows[0]?.count || 0, 
            selectedMembers, 
            myApplicationStatus 
        });
    } catch (err) {
        console.error('Error fetching project details:', err);
        return res.status(500).json({ error: 'Server error' });
    }
});

// Get applicants (owner/admin only)
router.get('/:id/applicants', async (req, res) => {
    const projectId = Number(req.params.id);
    const user = req.session.user;

    try {
        const [projectRows] = await pool.query('SELECT * FROM projects WHERE id = ?', [projectId]);
        const project = projectRows[0];
        if (!project) return res.status(404).json({ error: 'Project not found' });

        if (project.user_id !== user.id && Number(user.is_admin) !== 1) 
            return res.status(403).json({ error: 'Forbidden' });

        const [apps] = await pool.query(
            `SELECT a.status, a.user_id, u.name AS applicant_name, u.email AS applicant_email, 
                    u.bio, u.whatsapp, u.portfolio 
             FROM applications a JOIN users u ON a.user_id = u.id 
             WHERE a.project_id = ? ORDER BY a.created_at DESC`,
            [projectId]
        );

        return res.status(200).json({ applicants: apps });
    } catch (err) {
        console.error('Error fetching applicants:', err);
        return res.status(500).json({ error: 'Server error' });
    }
});

// Apply to project
router.post('/:id/apply', async (req, res) => {
    const projectId = Number(req.params.id);
    const user = req.session.user;

    try {
        const [projectRows] = await pool.query('SELECT * FROM projects WHERE id = ?', [projectId]);
        const project = projectRows[0];
        if (!project) return res.status(404).json({ error: 'Project not found' });
        if (project.status !== 'approved') return res.status(400).json({ error: 'Applications are closed' });

        if (project.deadline && new Date(project.deadline + 'Z') < new Date()) {
            await pool.query('UPDATE projects SET status = "closed" WHERE id = ?', [projectId]);
            return res.status(400).json({ error: 'The application deadline has passed' });
        }

        const [exists] = await pool.query(
            'SELECT id FROM applications WHERE project_id = ? AND user_id = ?',
            [projectId, user.id]
        );
        if (exists.length) return res.status(400).json({ error: 'You have already applied' });

        await pool.query(
            'INSERT INTO applications (project_id, user_id, status) VALUES (?, ?, ?)',
            [projectId, user.id, 'applied']
        );

        // Notify owner
        await pool.query(
            'INSERT INTO notifications (user_id, type, message, link) VALUES (?, ?, ?, ?)',
            [project.user_id, 'application', `${user.name} applied to your project: ${project.title}.`, `/project.html?id=${projectId}`]
        );

        return res.status(200).json({ ok: true, message: 'Application submitted' });
    } catch (err) {
        console.error('Error applying:', err);
        return res.status(500).json({ error: 'Server error' });
    }
});

// Submit feedback
router.post('/:id/feedback', async (req, res) => {
    const projectId = Number(req.params.id);
    const user = req.session.user;
    const { message } = req.body;

    if (!message || !projectId) return res.status(400).json({ error: 'Missing fields' });

    try {
        await pool.query(
            'INSERT INTO feedbacks (project_id, user_id, message) VALUES (?, ?, ?)',
            [projectId, user.id, message]
        );
        return res.status(200).json({ ok: true, message: 'Feedback submitted' });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Server error' });
    }
});

// Close applications (owner only)
router.post('/:id/close', async (req, res) => {
    const projectId = Number(req.params.id);
    const userId = req.session.user.id;

    try {
        const [rows] = await pool.query('SELECT user_id, status FROM projects WHERE id = ?', [projectId]);
        const project = rows[0];
        if (!project) return res.status(404).json({ error: 'Project not found' });
        if (project.user_id !== userId) return res.status(403).json({ error: 'Forbidden' });
        if (project.status === 'closed') return res.status(400).json({ error: 'Applications are already closed' });

        await pool.query('UPDATE projects SET status = "closed" WHERE id = ?', [projectId]);
        return res.status(200).json({ ok: true, message: 'Applications closed successfully' });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
