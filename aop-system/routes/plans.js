const express  = require('express');
const router   = express.Router();
const multer   = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('cloudinary').v2;
const { createClient } = require('@libsql/client');
const authMiddleware = require('../middleware/auth');

// ── Turso Connection ──
const db = createClient({
  url: process.env.TURSO_DATABASE_URL || 'file:aop_database.sqlite',
  authToken: process.env.TURSO_AUTH_TOKEN
});

// ── Cloudinary Config ──
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Tell Multer to send files directly to Cloudinary
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'aop_proofs',
    resource_type: 'auto' // Crucial: 'auto' allows it to accept both images AND PDFs
  }
});

// Enforce Cloudinary's 10MB free tier limit
const upload = multer({ storage: storage, limits: { fileSize: 10 * 1024 * 1024 } });

// Helper: parse uploaded files per row
function applyFiles(req, rows) {
  if (!req.files) return rows;
  Object.entries(req.files).forEach(([fieldname, fileArr]) => {
    const match = fieldname.match(/^file_row_(\d+)$/);
    if (match) {
      const rowNo = parseInt(match[1]);
      const row = rows.find(r => r.rowNo === rowNo);
      // Cloudinary saves the secure web URL inside the 'path' variable
      if (row) row.proofFile = fileArr[0].path; 
    }
  });
  return rows;
}

// ── GET all plans ──
router.get('/', authMiddleware, async (req, res) => {
  try {
    const result = await db.execute('SELECT * FROM plans ORDER BY idNo DESC');
    const plans = result.rows.map(row => ({
      ...row,
      rows: JSON.parse(row.rowsData || '[]')
    }));
    res.json(plans);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── GET single plan ──
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const result = await db.execute({ sql: 'SELECT * FROM plans WHERE _id = ?', args: [req.params.id] });
    if (result.rows.length === 0) return res.status(404).json({ message: 'Plan not found' });
    
    const plan = result.rows[0];
    plan.rows = JSON.parse(plan.rowsData || '[]');
    res.json(plan);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── POST create plan ──
router.post('/', authMiddleware, upload.fields(
  Array.from({ length: 50 }, (_, i) => ({ name: `file_row_${i + 1}`, maxCount: 1 }))
), async (req, res) => {
  try {
    let rows = JSON.parse(req.body.rows || '[]');
    rows = applyFiles(req, rows);

    const maxResult = await db.execute('SELECT MAX(idNo) as maxId FROM plans');
    const nextIdNo = Number(maxResult.rows[0]?.maxId || 0) + 1;
    
    const _id = 'plan_' + Date.now();
    const now = new Date().toISOString();

    await db.execute({
      sql: `INSERT INTO plans (_id, idNo, developmentArea, outcome, strategy, rowsData, createdAt, updatedAt) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [_id, nextIdNo, req.body.developmentArea, req.body.outcome, req.body.strategy, JSON.stringify(rows), now, now]
    });

    res.status(201).json({ message: 'Created', _id, idNo: nextIdNo });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// ── PUT update plan (Turso Version) ──
router.put('/:id', authMiddleware, upload.fields(
  Array.from({ length: 50 }, (_, i) => ({ name: `file_row_${i + 1}`, maxCount: 1 }))
), async (req, res) => {
  try {
    const existingResult = await db.execute({ sql: 'SELECT * FROM plans WHERE _id = ?', args: [req.params.id] });
    if (existingResult.rows.length === 0) return res.status(404).json({ message: 'Plan not found' });

    const existingPlan = existingResult.rows[0];
    const existingRows = JSON.parse(existingPlan.rowsData || '[]');
    let newRows = JSON.parse(req.body.rows || '[]');

    newRows = newRows.map(newRow => {
      const existing = existingRows.find(r => r.rowNo === newRow.rowNo);
      return {
        ...newRow,
        proofFile: newRow.existingProof || (existing ? existing.proofFile : '')
      };
    });

    newRows = applyFiles(req, newRows);
    const now = new Date().toISOString();

    await db.execute({
      sql: `UPDATE plans SET developmentArea = ?, outcome = ?, strategy = ?, rowsData = ?, updatedAt = ? WHERE _id = ?`,
      args: [req.body.developmentArea, req.body.outcome, req.body.strategy, JSON.stringify(newRows), now, req.params.id]
    });

    res.json({ message: 'Updated successfully' });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// ── DELETE plan (Turso Version) ──
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    await db.execute({ sql: 'DELETE FROM plans WHERE _id = ?', args: [req.params.id] });
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;