// server.js (final hosting setup)
const express = require('express');
const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();

// --- Middlewares ---
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- CORS Setup ---
app.use(cors({
  origin: [
    'http://localhost:5500',                 // for local testing
    'https://collabsphere-frontend.vercel.app', // if you host frontend separately later
  ],
  credentials: true
}));

// --- MySQL Session Store ---
const sessionStore = new MySQLStore({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 3306
});

app.use(session({
  key: 'user_session',
  secret: process.env.SESSION_SECRET || 'secretkey',
  store: sessionStore,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: true,      // ✅ Render uses HTTPS
    httpOnly: true,
    sameSite: 'none'   // ✅ allows cookies across domains
  }
}));

// --- Serve static frontend files ---
app.use(express.static(path.join(__dirname, 'public')));

// --- Routes ---
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const projectRoutes = require('./routes/projects');
const profileRoutes = require('./routes/profile');
const notificationRoutes = require('./routes/notifications');

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/notifications', notificationRoutes);

// --- Fallback for SPA/HTML pages ---
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// --- Start server ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
