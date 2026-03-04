const getDbConnection = require('./connection');

async function initializeSchema() {
    const db = await getDbConnection();

    // Create Users Table
    await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT CHECK(role IN ('Admin', 'HR', 'Employee')) NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

    // Create Leaves Table
    await db.exec(`
    CREATE TABLE IF NOT EXISTS leaves (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      reason TEXT,
      status TEXT CHECK(status IN ('Pending', 'Approved', 'Rejected')) DEFAULT 'Pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

    // Create Assets Table
    await db.exec(`
    CREATE TABLE IF NOT EXISTS assets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      assigned_to INTEGER,
      status TEXT CHECK(status IN ('Available', 'Assigned', 'Maintenance')) DEFAULT 'Available',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL
    )
  `);

    console.log('Database schema successfully initialized.');
}

if (require.main === module) {
    // If run directly, execute the schema init
    initializeSchema()
        .then(() => process.exit(0))
        .catch((err) => {
            console.error('Failed to initialize schema', err);
            process.exit(1);
        });
}

module.exports = initializeSchema;
