// server.js - FINAL FIXED VERSION
const express = require('express');
const session = require('express-session');
const cors = require('cors');
const bodyParser = require('body-parser');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const projectRoutes = require('./routes/projects');
const adminRoutes = require('./routes/admin');
const profileRoutes = require('./routes/profile');
const notificationRoutes = require('./routes/notifications');
const selectionRoutes = require('./routes/selection');

const app = express();
const PORT = process.env.PORT || 3000;


const pool = require("./db"); // or your MySQL connection file

app.get("/test", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT NOW() AS time;");
    res.send(`✅ Backend and DB working fine! Server time: ${rows[0].time}`);
  } catch (err) {
    res.status(500).send("❌ Database connection failed: " + err.message);
  }
});



// ✅ Updated CORS (allows cookies + multi-origin local testing)
app.use(cors({
  origin: ['http://localhost:3000', 'http://127.0.0.1:5500', 'http://localhost:5500'],
  credentials: true
}));

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static('public'));

// ✅ Fixed Session setup
app.use(session({
  secret: 'collabsphere_secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000
  }
}));

// ✅ Routes (unchanged)
app.use('/auth', authRoutes);
app.use('/admin', adminRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/selection', selectionRoutes);

// ✅ (Optional) Debug route for checking session
app.get('/check-session', (req, res) => {
  if (req.session.user) {
    res.json({ loggedIn: true, user: req.session.user });
  } else {
    res.json({ loggedIn: false });
  }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
