import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

//mt    -- Get current folder path because we are using ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

//mt    -- Make sure the data folder exists
const dataDir = path.join(__dirname, "data");

if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

//mt    -- Database file path
const dbPath = path.join(dataDir, "receipts.db");

//mt    -- Connect to SQLite database
const db = new Database(dbPath);

//mt    -- Turn on foreign key support
db.pragma("foreign_keys = ON");

//mt    -- Create receipt groups table
db.prepare(`
    CREATE TABLE IF NOT EXISTS receipt_groups (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        createdAt TEXT NOT NULL,
        updatedAt TEXT
    )
`).run();

//mt    --  Create receipts table
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

//mt   -- Safely add new columns to existing receipts table
function addColumnIfMissing(tableName, columnName, columnDefinition) {
    const columns = db.prepare(`PRAGMA table_info(${tableName})`).all();

    const columnExists = columns.some((column) => column.name === columnName);

    if (!columnExists) {
        db.prepare(`
            ALTER TABLE ${tableName}
            ADD COLUMN ${columnName} ${columnDefinition}
        `).run();
    }
}


//mt    -- Formatted receipt data columns
addColumnIfMissing("receipts", "storeName", "TEXT");
addColumnIfMissing("receipts", "receiptDate", "TEXT");
addColumnIfMissing("receipts", "orderNumber", "TEXT");
addColumnIfMissing("receipts", "cashierNumber", "TEXT");
addColumnIfMissing("receipts", "customerNumber", "TEXT");
addColumnIfMissing("receipts", "phoneNumber", "TEXT");

addColumnIfMissing("receipts", "subTotal", "REAL DEFAULT 0");
addColumnIfMissing("receipts", "cannabisExciseTax", "REAL DEFAULT 0");
addColumnIfMissing("receipts", "localTax", "REAL DEFAULT 0");
addColumnIfMissing("receipts", "maSalesTax", "REAL DEFAULT 0");
addColumnIfMissing("receipts", "totalTax", "REAL DEFAULT 0");
addColumnIfMissing("receipts", "discount", "REAL DEFAULT 0");
addColumnIfMissing("receipts", "grandTotal", "REAL DEFAULT 0");

addColumnIfMissing("receipts", "totalItems", "REAL DEFAULT 0");
addColumnIfMissing("receipts", "totalGrams", "REAL DEFAULT 0");
addColumnIfMissing("receipts", "startingAllotment", "REAL DEFAULT 0");
addColumnIfMissing("receipts", "remainingAllotment", "REAL DEFAULT 0");
addColumnIfMissing("receipts", "updatedAt", "TEXT");


//mt   -- Receipt items table
db.prepare(`
    CREATE TABLE IF NOT EXISTS receipt_items (
        id TEXT PRIMARY KEY,
        receiptId TEXT NOT NULL,

        itemName TEXT,
        itemDetails TEXT,
        itemPrice REAL DEFAULT 0,
        itemQuantity REAL DEFAULT 0,
        itemGrams REAL DEFAULT 0,
        itemTotal REAL DEFAULT 0,

        createdAt TEXT NOT NULL,
        updatedAt TEXT,

        FOREIGN KEY (receiptId) REFERENCES receipts(id)
        ON DELETE CASCADE
    )
`).run();



//! Helpful indexes for searching later
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