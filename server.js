const express = require('express');
const session = require('express-session');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const projectRoutes = require('./routes/projects');
const adminRoutes = require('./routes/admin');
const profileRoutes = require('./routes/profile');
const notificationRoutes = require('./routes/notifications');
const selectionRoutes = require('./routes/selection');

const app = express();

// Middleware
app.use(cors({
  origin: 'https://collabsphere-uww0.onrender.com',
  credentials: true
}));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use(session({
  secret: 'your_secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: true, // true for HTTPS (Render uses HTTPS)
    sameSite: 'none', // critical for cross-domain
  }
}));



// API Routes
app.use('/auth', authRoutes);
app.use('/projects', projectRoutes);
app.use('/admin', adminRoutes);
app.use('/profile', profileRoutes);
app.use('/notifications', notificationRoutes);
app.use('/selection', selectionRoutes);

// Serve static frontend files
app.use(express.static(path.join(__dirname, 'public')));

// SPA Fallback for frontend routing (explicit paths only)
const spaRoutes = ['/','/profile','/projects','/notifications','/selection'];
app.get(spaRoutes, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Optional: serve JS from routes folder if frontend uses scripts from there
app.use('/js', express.static(path.join(__dirname, 'routes')));

app.get('/test', (req, res) => {
  res.send('Test route is working!');
});


// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
