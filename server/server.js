import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";


// Import database so tables are created when server starts
import db from "./db.js";

import receiptGroupRoutes from "./routes/receiptGroupRoutes.js";
import receiptRoutes from "./routes/receiptRoutes.js";

dotenv.config();

const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 3000;

// Make sure uploads folder exists
const uploadsDir = path.join(__dirname, "uploads", "receipts");

if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Middleware
app.use(cors({
    origin: [
        "http://localhost:5500",
        "http://127.0.0.1:5500"
    ],
    credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

//mt Serve uploaded receipt images
app.use("/uploads/receipts", express.static(uploadsDir));

//mt   -- Routes --
app.use("/api/groups", receiptGroupRoutes);
app.use("/api/receipts", receiptRoutes);



//mt   -- Test Routes --
// Test API route
app.get("/api/test", (req, res) => {
    res.json({
        message: "Receipt Scanner API is working",
        database: "SQLite connected"
    });
});


//mt Serve frontend files
const publicDir = path.join(__dirname, "..", "public");

app.use(express.static(publicDir));

//st Basic home route
app.get("/", (req, res) => {
    res.sendFile(path.join(publicDir, "index.html"));
});

//mt   --  Start server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});