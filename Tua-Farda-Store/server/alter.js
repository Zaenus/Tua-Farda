const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('shirts.db');

// Add unique constraint (drop and recreate reviews table if needed)
db.serialize(() => {
  db.run('DROP TABLE IF EXISTS reviews');
  db.run(`
    CREATE TABLE reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      shirt_id INTEGER,
      user_id INTEGER,
      rating INTEGER,
      comment TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (shirt_id) REFERENCES shirts(id),
      FOREIGN KEY (user_id) REFERENCES users(id),
      UNIQUE (shirt_id, user_id)
    )
  `);
});
db.close();