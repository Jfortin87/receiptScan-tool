import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

// Get current folder path because we are using ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Make sure the data folder exists
const dataDir = path.join(__dirname, "data");

if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

// Database file path
const dbPath = path.join(dataDir, "receipts.db");

// Connect to SQLite database
const db = new Database(dbPath);

// Turn on foreign key support
db.pragma("foreign_keys = ON");

// Create receipt groups table
db.prepare(`
    CREATE TABLE IF NOT EXISTS receipt_groups (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        createdAt TEXT NOT NULL,
        updatedAt TEXT
    )
`).run();

// Create receipts table
db.prepare(`
    CREATE TABLE IF NOT EXISTS receipts (
        id TEXT PRIMARY KEY,
        groupId TEXT NOT NULL,
        originalFileName TEXT NOT NULL,
        savedFileName TEXT NOT NULL,
        imagePath TEXT NOT NULL,
        rawText TEXT,
        ocrJson TEXT,
        createdAt TEXT NOT NULL,

        FOREIGN KEY (groupId) REFERENCES receipt_groups(id)
        ON DELETE CASCADE
    )
`).run();

// Helpful indexes for searching later
db.prepare(`
    CREATE INDEX IF NOT EXISTS idx_receipt_groups_title
    ON receipt_groups(title)
`).run();

db.prepare(`
    CREATE INDEX IF NOT EXISTS idx_receipt_groups_createdAt
    ON receipt_groups(createdAt)
`).run();

db.prepare(`
    CREATE INDEX IF NOT EXISTS idx_receipts_groupId
    ON receipts(groupId)
`).run();

console.log("SQLite database connected:", dbPath);

export default db;