const express  = require('express');
const router   = express.Router();
const multer   = require('multer');
const path     = require('path');
const fs       = require('fs');
const Plan     = require('../models/Plan');
const authMiddleware = require('../middleware/auth');

// ── Storage config ────────────────────────────────────────────────────────────
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  }
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } }); // 10 MB

// helper: parse uploaded files per row
function applyFiles(req, rows) {
  if (!req.files) return rows;
  Object.entries(req.files).forEach(([fieldname, fileArr]) => {
    const match = fieldname.match(/^file_row_(\d+)$/);
    if (match) {
      const rowNo = parseInt(match[1]);
      const row = rows.find(r => r.rowNo === rowNo);
      if (row) row.proofFile = fileArr[0].filename;
    }
  });
  return rows;
}

// ── GET all plans ─────────────────────────────────────────────────────────────
router.get('/', authMiddleware, async (req, res) => {
  try {
    const plans = await Plan.find().sort({ createdAt: -1 });
    res.json(plans);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── GET single plan ───────────────────────────────────────────────────────────
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const plan = await Plan.findById(req.params.id);
    if (!plan) return res.status(404).json({ message: 'Plan not found' });
    res.json(plan);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── POST create plan ──────────────────────────────────────────────────────────
router.post('/', authMiddleware, upload.fields(
  Array.from({ length: 50 }, (_, i) => ({ name: `file_row_${i + 1}`, maxCount: 1 }))
), async (req, res) => {
  try {
    let rows = JSON.parse(req.body.rows || '[]');
    rows = applyFiles(req, rows);

    const plan = new Plan({
      developmentArea: req.body.developmentArea,
      outcome:         req.body.outcome,
      strategy:        req.body.strategy,
      rows,
      createdBy: req.user?._id
    });

    await plan.save();
    res.status(201).json(plan);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// ── PUT update plan ───────────────────────────────────────────────────────────
router.put('/:id', authMiddleware, upload.fields(
  Array.from({ length: 50 }, (_, i) => ({ name: `file_row_${i + 1}`, maxCount: 1 }))
), async (req, res) => {
  try {
    const plan = await Plan.findById(req.params.id);
    if (!plan) return res.status(404).json({ message: 'Plan not found' });

    let rows = JSON.parse(req.body.rows || '[]');

    // Preserve existing proofFile if no new file uploaded for that row
    rows = rows.map(newRow => {
      const existing = plan.rows.find(r => r.rowNo === newRow.rowNo);
      return {
        ...newRow,
        proofFile: newRow.existingProof || existing?.proofFile || ''
      };
    });

    rows = applyFiles(req, rows);

    plan.developmentArea = req.body.developmentArea;
    plan.outcome         = req.body.outcome;
    plan.strategy        = req.body.strategy;
    plan.rows            = rows;

    await plan.save();
    res.json(plan);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// ── DELETE plan ───────────────────────────────────────────────────────────────
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    await Plan.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
