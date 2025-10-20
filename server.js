const express = require('express');
const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
require('dotenv').config();

// Routes
const authRoutes = require('./routes/auth');
const projectRoutes = require('./routes/projects');
const adminRoutes = require('./routes/admin');
const profileRoutes = require('./routes/profile');
const notificationRoutes = require('./routes/notifications');
const selectionRoutes = require('./routes/selection');

const app = express();

// ==========================
// ✅ CORS (must come before session)
// ==========================
app.use(cors({
  origin: 'http://localhost:3000', // your frontend origin
  credentials: true,               // allow cookies across origin
}));

// ==========================
// ✅ Middleware
// ==========================
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// ==========================
// ✅ MySQL session store
// ==========================
const sessionStore = new MySQLStore({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

// ==========================
// ✅ Session setup
// ==========================
app.use(
  session({
    key: 'collabsphere.sid',        // Cookie name (must match across app)
    secret: process.env.SESSION_SECRET || 'secret_key',
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: false,                // false for localhost (true only on HTTPS)
      sameSite: 'lax',
    },
  })
);

// ==========================
// ✅ API Routes
// ==========================
app.use('/auth', authRoutes);
app.use('/projects', projectRoutes);
app.use('/admin', adminRoutes);
app.use('/profile', profileRoutes);
app.use('/notifications', notificationRoutes);
app.use('/selection', selectionRoutes);

// ==========================
// ✅ Serve static frontend files
// ==========================
app.use(express.static(path.join(__dirname, 'public')));

// ✅ Fallback for frontend routes
const spaRoutes = ['/', '/profile', '/projects', '/notifications', '/selection'];
app.get(spaRoutes, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ✅ Optional: serve JS from routes folder if needed
app.use('/js', express.static(path.join(__dirname, 'routes')));

// ✅ Test route
app.get('/test', (req, res) => {
  res.send('Server and session test route working fine.');
});

// ==========================
// ✅ Start server
// ==========================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});
