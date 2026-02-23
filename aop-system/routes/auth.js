const express = require('express');
const router  = express.Router();
const jwt     = require('jsonwebtoken');
const bcrypt  = require('bcrypt');
const { createClient } = require('@libsql/client');

const db = createClient({
  url: process.env.TURSO_DATABASE_URL || 'file:aop_database.sqlite',
  authToken: process.env.TURSO_AUTH_TOKEN
});

// ── Register ──
router.post('/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'Email and password required' });

    const exists = await db.execute({ sql: 'SELECT * FROM users WHERE email = ?', args: [email] });
    if (exists.rows.length > 0) return res.status(409).json({ message: 'Email already registered' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await db.execute({
      sql: 'INSERT INTO users (name, email, password) VALUES (?, ?, ?) RETURNING id',
      args: [name, email, hashedPassword]
    });

    const newUserId = Number(result.rows[0].id);
    const token = jwt.sign({ id: newUserId }, process.env.JWT_SECRET || 'secret', { expiresIn: '7d' });
    
    res.status(201).json({ token, user: { id: newUserId, email, name } });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── Login ──
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await db.execute({ sql: 'SELECT * FROM users WHERE email = ?', args: [email] });
    
    if (result.rows.length === 0) return res.status(401).json({ message: 'Invalid email or password' });

    const user = result.rows[0];
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ message: 'Invalid email or password' });

    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET || 'secret', { expiresIn: '7d' });
    res.json({ token, user: { id: user.id, email: user.email, name: user.name } });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;