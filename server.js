// server.js
const express = require('express');
const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);
const cors = require('cors');
const bodyParser = require('body-parser');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const projectRoutes = require('./routes/projects');
const adminRoutes = require('./routes/admin');
const profileRoutes = require('./routes/profile');
const notificationRoutes = require('./routes/notifications');
const selectionRoutes = require('./routes/selection');

const pool = require('./config/db'); // your MySQL connection file

const app = express();
const PORT = process.env.PORT || 3000;

// ✅ Test route for backend + DB
app.get("/test", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT NOW() AS time;");
    res.send(`✅ Backend and DB working fine! Server time: ${rows[0].time}`);
  } catch (err) {
    res.status(500).send("❌ Database connection failed: " + err.message);
  }
});

// ✅ Step 2: CORS
app.use(cors({
  origin: [
    'https://your-frontend-domain.vercel.app', // ⚠️ Replace with your frontend URL
    'http://localhost:5500'                     // for local testing
  ],
  credentials: true
}));

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static('public'));

// ✅ Step 3: Session store (MySQL)
const sessionStore = new MySQLStore({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  clearExpired: true,
  checkExpirationInterval: 900000, // 15 min
  expiration: 86400000             // 24 hours
});

app.use(session({
  key: 'collabsphere.sid',
  secret: process.env.SESSION_SECRET || 'collabsphere_secret',
  store: sessionStore,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'none',    // allows cross-site cookies
    secure: true,        // HTTPS required
    maxAge: 24 * 60 * 60 * 1000
  }
}));

// ✅ Step 4: Routes
app.use('/auth', authRoutes);
app.use('/admin', adminRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/selection', selectionRoutes);

// ✅ Optional: Debug session route
app.get('/check-session', (req, res) => {
  if (req.session.user) {
    res.json({ loggedIn: true, user: req.session.user });
  } else {
    res.json({ loggedIn: false });
  }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
