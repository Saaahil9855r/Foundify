require('dotenv').config();
const express = require('express');
const cors = require('cors');
const Fuse = require('fuse.js');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('./database');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// JWT & Security Config
const JWT_SECRET = process.env.JWT_SECRET;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const ADMIN_PASSWORD_HASH = bcrypt.hashSync(ADMIN_PASSWORD, 10);

// Ensure uploads folder exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

// Serve uploaded images statically
app.use('/uploads', express.static(uploadsDir));

// Multer Storage Configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB max
});

// Middleware to verify JWT Token for Protected Routes
function authenticateAdmin(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access denied. No authentication token provided.' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired session token.' });
    }
    req.user = user;
    next();
  });
}

// Smart Fuzzy Matcher Engine
function findMatches(newItem, candidates) {
  const validCandidates = candidates.filter(
    (c) => c.type !== newItem.type && c.category.toLowerCase() === newItem.category.toLowerCase()
  );

  if (validCandidates.length === 0) return [];

  const fuse = new Fuse(validCandidates, {
    keys: [
      { name: 'title', weight: 0.5 },
      { name: 'description', weight: 0.3 },
      { name: 'location', weight: 0.2 }
    ],
    includeScore: true,
    threshold: 0.5
  });

  const query = `${newItem.title} ${newItem.description} ${newItem.location}`;
  const results = fuse.search(query);

  return results.map((res) => ({
    ...res.item,
    confidence: Math.round((1 - res.score) * 100)
  }));
}

// --- PUBLIC ROUTES ---

// 1. Get All Items (with filter support)
app.get('/api/items', (req, res) => {
  const { type, category, status } = req.query;
  let query = 'SELECT * FROM items WHERE 1=1';
  const params = [];

  if (status && status !== 'All') {
    query += ' AND status = ?';
    params.push(status.toLowerCase());
  }
  if (type && type !== 'All') {
    query += ' AND type = ?';
    params.push(type.toLowerCase());
  }
  if (category && category !== 'All') {
    query += ' AND category = ?';
    params.push(category);
  }

  query += ' ORDER BY created_at DESC';

  db.all(query, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// 2. Report Item (with optional image upload)
app.post('/api/items', upload.single('image'), (req, res) => {
  const { type, category, title, description, location, roll_no, email } = req.body;
  const image_url = req.file ? `/uploads/${req.file.filename}` : null;

  if (!type || !category || !title || !description || !location || !roll_no || !email) {
    return res.status(400).json({ error: 'All text fields are required.' });
  }

  const query = `
    INSERT INTO items (type, category, title, description, location, roll_no, email, image_url)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `;
  const params = [type.toLowerCase(), category, title, description, location, roll_no, email, image_url];

  db.run(query, params, function (err) {
    if (err) return res.status(500).json({ error: err.message });

    const newItemId = this.lastID;
    const newItem = { id: newItemId, type: type.toLowerCase(), category, title, description, location, roll_no, email, image_url };

    db.all('SELECT * FROM items WHERE status = "open" AND id != ?', [newItemId], (err, openItems) => {
      if (err) return res.status(201).json({ item: newItem, matches: [] });

      const matches = findMatches(newItem, openItems);
      res.status(201).json({
        message: 'Item registered successfully!',
        item: newItem,
        matches
      });
    });
  });
});

// 3. Submit Claim
app.post('/api/claims', (req, res) => {
  const { item_id, claimant_roll_no, claimant_email, proof_details } = req.body;

  if (!item_id || !claimant_roll_no || !claimant_email || !proof_details) {
    return res.status(400).json({ error: 'Missing required claim verification data.' });
  }

  const query = `
    INSERT INTO claims (item_id, claimant_roll_no, claimant_email, proof_details)
    VALUES (?, ?, ?, ?)
  `;
  db.run(query, [item_id, claimant_roll_no, claimant_email, proof_details], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    
    db.run('UPDATE items SET status = "claimed" WHERE id = ?', [item_id]);

    res.status(201).json({ 
      message: 'Claim submitted successfully!',
      claim_id: this.lastID,
      item_id
    });
  });
});

// --- ADMIN & SECURITY DESK ROUTES (PROTECTED) ---

// 4. Admin Login Route (Generates JWT)
app.post('/api/admin/login', (req, res) => {
  const { passcode } = req.body;

  if (!passcode) {
    return res.status(400).json({ error: 'Passcode is required.' });
  }

  const isMatch = bcrypt.compareSync(passcode, ADMIN_PASSWORD_HASH);
  if (!isMatch) {
    return res.status(401).json({ error: 'Invalid security passcode.' });
  }

  const token = jwt.sign({ role: 'admin' }, JWT_SECRET, { expiresIn: '2h' });
  res.json({ message: 'Authentication successful', token });
});

// 5. Admin: Get all claims (Protected by JWT)
app.get('/api/admin/claims', authenticateAdmin, (req, res) => {
  const query = `
    SELECT 
      claims.id AS claim_id,
      claims.item_id,
      claims.claimant_roll_no,
      claims.claimant_email,
      claims.proof_details,
      claims.status AS claim_status,
      claims.created_at AS claim_time,
      items.title AS item_title,
      items.category AS item_category,
      items.location AS item_location,
      items.image_url AS item_image_url,
      items.roll_no AS reporter_roll_no
    FROM claims
    JOIN items ON claims.item_id = items.id
    ORDER BY claims.created_at DESC
  `;
  db.all(query, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// 6. Admin: Approve / Reject Claim (Protected by JWT)
app.patch('/api/admin/claims/:id', authenticateAdmin, (req, res) => {
  const { id } = req.params;
  const { status, item_id } = req.body;

  db.run('UPDATE claims SET status = ? WHERE id = ?', [status, id], function (err) {
    if (err) return res.status(500).json({ error: err.message });

    if (status === 'approved') {
      db.run('UPDATE items SET status = "closed" WHERE id = ?', [item_id]);
    } else {
      db.run('UPDATE items SET status = "open" WHERE id = ?', [item_id]);
    }

    res.json({ message: `Claim has been ${status}.` });
  });
});

const PORT = 5000;
app.listen(PORT, () => console.log(`Foundify Server listening on http://localhost:${PORT}`));