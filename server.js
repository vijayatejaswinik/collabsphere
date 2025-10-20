const express = require('express');
const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');

// ✅ 3. MySQL session store (so sessions persist even if server restarts)
const MySQLStore = require('express-mysql-session')(session);

// Routes
const authRoutes = require('./routes/auth');
const projectRoutes = require('./routes/projects');
const adminRoutes = require('./routes/admin');
const profileRoutes = require('./routes/profile');
const notificationRoutes = require('./routes/notifications');
const selectionRoutes = require('./routes/selection');

const app = express();

<<<<<<< HEAD
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
=======
// ✅ 1. CORS setup (must specify frontend origin)
app.use(cors({
  origin: 'https://collabsphere-uww0.onrender.com', // ⬅️ replace with your actual frontend Render URL
  credentials: true,
}));

// ✅ 2. Body parser
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const sessionStore = new MySQLStore({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 3306,
>>>>>>> 77d808602a515261e6836fa48538a458fe45f8a4
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});
<<<<<<< HEAD

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
=======

// ✅ 4. Session configuration
app.use(session({
  key: 'collabsphere.sid',
  secret: 'your_secret',
  store: sessionStore,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: true, // Render uses HTTPS
    sameSite: 'none', // required for cross-domain cookies
    maxAge: 1000 * 60 * 60 * 24, // 1 day
  },
}));

// ✅ 5. API Routes
>>>>>>> 77d808602a515261e6836fa48538a458fe45f8a4
app.use('/auth', authRoutes);
app.use('/projects', projectRoutes);
app.use('/admin', adminRoutes);
app.use('/profile', profileRoutes);
app.use('/notifications', notificationRoutes);
app.use('/selection', selectionRoutes);

<<<<<<< HEAD
// ==========================
// ✅ Serve static frontend files
// ==========================
app.use(express.static(path.join(__dirname, 'public')));

// ✅ Fallback for frontend routes
=======
// ✅ 6. Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// ✅ 7. SPA fallback routes
>>>>>>> 77d808602a515261e6836fa48538a458fe45f8a4
const spaRoutes = ['/', '/profile', '/projects', '/notifications', '/selection'];
app.get(spaRoutes, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

<<<<<<< HEAD
// ✅ Optional: serve JS from routes folder if needed
app.use('/js', express.static(path.join(__dirname, 'routes')));

// ✅ Test route
=======
// ✅ 8. Optional test route
>>>>>>> 77d808602a515261e6836fa48538a458fe45f8a4
app.get('/test', (req, res) => {
  res.send('Server and session test route working fine.');
});

<<<<<<< HEAD
// ==========================
// ✅ Start server
// ==========================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
=======
// ✅ 9. Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
>>>>>>> 77d808602a515261e6836fa48538a458fe45f8a4
});
