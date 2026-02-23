require("dotenv").config();
const express = require("express");
const { createClient } = require('@libsql/client');
const cors = require("cors");
const path = require('path');

const authRoutes = require('./routes/auth');
const planRoutes = require('./routes/plans');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Middleware ──
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve files and frontend
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.static(path.join(__dirname, 'public')));

// ── API Routes ──
app.use('/api/auth',  authRoutes);
app.use('/api/plans', planRoutes);

// SPA fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ── Turso Connection ──
const db = createClient({
  url: process.env.TURSO_DATABASE_URL || 'file:aop_database.sqlite',
  authToken: process.env.TURSO_AUTH_TOKEN
});

// ── Initialize Tables (Cloud Version) ──
async function initDB() {
  try {
    await db.execute(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      email TEXT UNIQUE,
      password TEXT
    )`);

    await db.execute(`CREATE TABLE IF NOT EXISTS plans (
      _id TEXT PRIMARY KEY,
      idNo INTEGER,
      developmentArea TEXT,
      outcome TEXT,
      strategy TEXT,
      rowsData TEXT, 
      createdAt TEXT,
      updatedAt TEXT,
      userId INTEGER 
    )`);

    // Safely upgrade the existing live table to support private accounts
    try {
      await db.execute(`ALTER TABLE plans ADD COLUMN userId INTEGER`);
      console.log('Upgraded plans table with userId column.');
    } catch (e) {
      // If the column already exists, it silently moves on!
    }

    console.log('Turso Database connected and tables verified.');
  } catch (err) {
    console.error('Database initialization failed:', err);
  }
}
initDB();

app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));