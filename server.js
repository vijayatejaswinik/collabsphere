const express = require('express');
const session = require('express-session');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');

// ✅ 3. MySQL session store (so sessions persist even if server restarts)
const MySQLStore = require('express-mysql-session')(session);

const authRoutes = require('./routes/auth');
const projectRoutes = require('./routes/projects');
const adminRoutes = require('./routes/admin');
const profileRoutes = require('./routes/profile');
const notificationRoutes = require('./routes/notifications');
const selectionRoutes = require('./routes/selection');

const app = express();

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
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

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
app.use('/auth', authRoutes);
app.use('/projects', projectRoutes);
app.use('/admin', adminRoutes);
app.use('/profile', profileRoutes);
app.use('/notifications', notificationRoutes);
app.use('/selection', selectionRoutes);

// ✅ 6. Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// ✅ 7. SPA fallback routes
const spaRoutes = ['/', '/profile', '/projects', '/notifications', '/selection'];
app.get(spaRoutes, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ✅ 8. Optional test route
app.get('/test', (req, res) => {
  res.send('Test route is working!');
});

// ✅ 9. Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
