const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
const path = require('path');

// Determine path to the SQLite DB
const dbPath = path.resolve(__dirname, '../../telemetry.db');

let dbInstance = null;

async function getDbConnection() {
    if (dbInstance) {
        return dbInstance;
    }

    try {
        dbInstance = await open({
            filename: dbPath,
            driver: sqlite3.Database
        });

        // Enable foreign keys
        await dbInstance.run('PRAGMA foreign_keys = ON');

        console.log(`Connected to SQLite database at ${dbPath}`);
        return dbInstance;
    } catch (err) {
        console.error(`Error connecting to SQLite database at ${dbPath}`, err);
        throw err;
    }
}

module.exports = getDbConnection;
