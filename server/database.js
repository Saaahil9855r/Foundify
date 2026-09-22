const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');

const dbPath = path.resolve(__dirname, 'foundify.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) console.error('Database connection error:', err.message);
  else console.log('Connected to SQLite database: foundify.db');
});

db.serialize(() => {
  // 1. Items Table
  db.run(`
    CREATE TABLE IF NOT EXISTS items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT CHECK(type IN ('lost', 'found')) NOT NULL,
      category TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      location TEXT NOT NULL,
      roll_no TEXT NOT NULL,
      email TEXT NOT NULL,
      image_url TEXT,
      status TEXT DEFAULT 'open' CHECK(status IN ('open', 'claimed', 'closed')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 2. Claims Table
  db.run(`
    CREATE TABLE IF NOT EXISTS claims (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      item_id INTEGER NOT NULL,
      claimant_roll_no TEXT NOT NULL,
      claimant_email TEXT NOT NULL,
      proof_details TEXT NOT NULL,
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'rejected')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(item_id) REFERENCES items(id)
    )
  `);

  // 3. Admin Accounts Table
  db.run(`
    CREATE TABLE IF NOT EXISTS admins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      full_name TEXT NOT NULL,
      role TEXT DEFAULT 'security_officer',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `, () => {
    // Seed default admin if table is empty: (Username: admin, Password: admin123)
    db.get('SELECT COUNT(*) as count FROM admins', [], (err, row) => {
      if (!err && row && row.count === 0) {
        const defaultHash = bcrypt.hashSync(process.env.ADMIN_PASSWORD, 10);
        db.run(
          'INSERT INTO admins (username, password_hash, full_name, role) VALUES (?, ?, ?, ?)',
          ['admin', defaultHash, 'Campus Security Desk', 'head_security']
        );
        console.log('Seeded initial admin account: username="admin"');
      }
    });
  });
});

module.exports = db;