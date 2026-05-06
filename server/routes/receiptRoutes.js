import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { v4 as uuidv4 } from "uuid";
import Tesseract from "tesseract.js";


import db from "../db.js";

//mt    -- Gemini Recept Parser
import { parseReceiptWithGemini } from "../services/geminiReceiptParser.js";

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Upload folder path:
// server/uploads/receipts
const uploadDir = path.join(__dirname, "..", "uploads", "receipts");

if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer storage setup
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },

    filename: (req, file, cb) => {
        const fileExt = path.extname(file.originalname).toLowerCase();
        const savedFileName = `${uuidv4()}${fileExt}`;

        cb(null, savedFileName);
    }
});

// Only allow image uploads
const fileFilter = (req, file, cb) => {
    const allowedTypes = [
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/webp"
    ];

    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error("Only JPG, PNG, and WEBP images are allowed"));
    }
};

const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    }
});

//mt    -- Upload receipt image and run OCR
router.post("/upload/:groupId", upload.single("receiptImage"), async (req, res) => {
    try {
        const { groupId } = req.params;

        //st Make sure group exists
        const group = db.prepare(`
            SELECT *
            FROM receipt_groups
            WHERE id = ?
        `).get(groupId);

        if (!group) {
            if (req.file) {
                fs.unlinkSync(req.file.path);
            }

            return res.status(404).json({
                error: "Receipt group not found"
            });
        }

        if (!req.file) {
            return res.status(400).json({
                error: "Receipt image is required"
            });
        }

        const receiptId = uuidv4();
        const createdAt = new Date().toISOString();

        const originalFileName = req.file.originalname;
        const savedFileName = req.file.filename;

        //st This is the path saved for browser use
        const imagePath = `/uploads/receipts/${savedFileName}`;

        //st This is the real server file path for OCR
        const fullImagePath = req.file.path;

        console.log("Running OCR on:", fullImagePath);

        const ocrResult = await Tesseract.recognize(fullImagePath, "eng");

        const rawText = ocrResult.data.text || "";

        //st Clean JSON object for database storage
        const cleanOcrJson = {
            confidence: ocrResult.data.confidence ?? null,
            text: rawText,
            lines: (ocrResult.data.lines || []).map((line) => ({
                text: line.text,
                confidence: line.confidence,
                bbox: line.bbox
            })),
            words: (ocrResult.data.words || []).map((word) => ({
                text: word.text,
                confidence: word.confidence,
                bbox: word.bbox
            }))
        };

        const newReceipt = {
            id: receiptId,
            groupId,
            originalFileName,
            savedFileName,
            imagePath,
            rawText,
            ocrJson: JSON.stringify(cleanOcrJson),
            createdAt
        };

        db.prepare(`
            INSERT INTO receipts (
                id,
                groupId,
                originalFileName,
                savedFileName,
                imagePath,
                rawText,
                ocrJson,
                createdAt
            )
            VALUES (
                @id,
                @groupId,
                @originalFileName,
                @savedFileName,
                @imagePath,
                @rawText,
                @ocrJson,
                @createdAt
            )
        `).run(newReceipt);

        res.status(201).json({
            message: "Receipt uploaded and scanned",
            receipt: {
                ...newReceipt,
                ocrJson: cleanOcrJson
            }
        });
    } catch (error) {
        console.error("UPLOAD RECEIPT ERROR:", error);

        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }

        res.status(500).json({
            error: "Failed to upload and scan receipt"
        });
    }
});

//mt    -- Get all receipts from one group
router.get("/group/:groupId", (req, res) => {
    try {
        const { groupId } = req.params;

        const receipts = db.prepare(`
            SELECT *
            FROM receipts
            WHERE groupId = ?
            ORDER BY createdAt DESC
        `).all(groupId);

        const formattedReceipts = receipts.map((receipt) => ({
            ...receipt,
            ocrJson: receipt.ocrJson ? JSON.parse(receipt.ocrJson) : null
        }));

        res.json(formattedReceipts);
    } catch (error) {
        console.error("GET RECEIPTS BY GROUP ERROR:", error);

        res.status(500).json({
            error: "Failed to get receipts"
        });
    }
});

//mt    -- Update formatted receipt data
router.put("/:receiptId/formatted-data", (req, res) => {
    try {
        const { receiptId } = req.params;

        const receipt = db.prepare(`
            SELECT *
            FROM receipts
            WHERE id = ?
        `).get(receiptId);

        if (!receipt) {
            return res.status(404).json({
                error: "Receipt not found"
            });
        }

        const toNumber = (value) => {
            const numberValue = Number(value);

            if (Number.isNaN(numberValue)) {
                return 0;
            }

            return numberValue;
        };

        const updatedReceiptData = {
            id: receiptId,

            storeName: req.body.storeName || null,
            receiptDate: req.body.receiptDate || null,
            orderNumber: req.body.orderNumber || null,
            cashierNumber: req.body.cashierNumber || null,
            customerNumber: req.body.customerNumber || null,
            phoneNumber: req.body.phoneNumber || null,

            subTotal: toNumber(req.body.subTotal),
            cannabisExciseTax: toNumber(req.body.cannabisExciseTax),
            localTax: toNumber(req.body.localTax),
            maSalesTax: toNumber(req.body.maSalesTax),
            totalTax: toNumber(req.body.totalTax),
            discount: toNumber(req.body.discount),
            grandTotal: toNumber(req.body.grandTotal),

            totalItems: toNumber(req.body.totalItems),
            totalGrams: toNumber(req.body.totalGrams),
            startingAllotment: toNumber(req.body.startingAllotment),
            remainingAllotment: toNumber(req.body.remainingAllotment),

            updatedAt: new Date().toISOString()
        };

        db.prepare(`
            UPDATE receipts
            SET
                storeName = @storeName,
                receiptDate = @receiptDate,
                orderNumber = @orderNumber,
                cashierNumber = @cashierNumber,
                customerNumber = @customerNumber,
                phoneNumber = @phoneNumber,

                subTotal = @subTotal,
                cannabisExciseTax = @cannabisExciseTax,
                localTax = @localTax,
                maSalesTax = @maSalesTax,
                totalTax = @totalTax,
                discount = @discount,
                grandTotal = @grandTotal,

                totalItems = @totalItems,
                totalGrams = @totalGrams,
                startingAllotment = @startingAllotment,
                remainingAllotment = @remainingAllotment,

                updatedAt = @updatedAt
            WHERE id = @id
        `).run(updatedReceiptData);

        const updatedReceipt = db.prepare(`
            SELECT *
            FROM receipts
            WHERE id = ?
        `).get(receiptId);

        res.json({
            message: "Formatted receipt data updated",
            receipt: updatedReceipt
        });
    } catch (error) {
        console.error("UPDATE FORMATTED RECEIPT DATA ERROR:", error);

        res.status(500).json({
            error: "Failed to update formatted receipt data"
        });
    }
});


//mt    -- Update receipt items
router.put("/:receiptId/items", (req, res) => {
    try {
        const { receiptId } = req.params;
        const { items } = req.body;

        const receipt = db.prepare(`
            SELECT *
            FROM receipts
            WHERE id = ?
        `).get(receiptId);

        if (!receipt) {
            return res.status(404).json({
                error: "Receipt not found"
            });
        }

        if (!Array.isArray(items)) {
            return res.status(400).json({
                error: "Items must be an array"
            });
        }

        const toNumber = (value) => {
            const numberValue = Number(value);

            if (Number.isNaN(numberValue)) {
                return 0;
            }

            return numberValue;
        };

        const now = new Date().toISOString();

        const deleteOldItems = db.prepare(`
            DELETE FROM receipt_items
            WHERE receiptId = ?
        `);

        const insertItem = db.prepare(`
            INSERT INTO receipt_items (
                id,
                receiptId,
                itemName,
                itemDetails,
                itemPrice,
                itemQuantity,
                itemGrams,
                itemTotal,
                createdAt,
                updatedAt
            )
            VALUES (
                @id,
                @receiptId,
                @itemName,
                @itemDetails,
                @itemPrice,
                @itemQuantity,
                @itemGrams,
                @itemTotal,
                @createdAt,
                @updatedAt
            )
        `);

        const saveItemsTransaction = db.transaction(() => {
            deleteOldItems.run(receiptId);

            items.forEach((item) => {
                const formattedItem = {
                    id: uuidv4(),
                    receiptId,
                    itemName: item.itemName || null,
                    itemDetails: item.itemDetails || null,
                    itemPrice: toNumber(item.itemPrice),
                    itemQuantity: toNumber(item.itemQuantity),
                    itemGrams: toNumber(item.itemGrams),
                    itemTotal: toNumber(item.itemTotal),
                    createdAt: now,
                    updatedAt: now
                };

                insertItem.run(formattedItem);
            });
        });

        saveItemsTransaction();

        const updatedItems = db.prepare(`
            SELECT *
            FROM receipt_items
            WHERE receiptId = ?
            ORDER BY createdAt ASC
        `).all(receiptId);

        res.json({
            message: "Receipt items updated",
            items: updatedItems
        });
    } catch (error) {
        console.error("UPDATE RECEIPT ITEMS ERROR:", error);

        res.status(500).json({
            error: "Failed to update receipt items"
        });
    }
});

//st    -- Get one receipt with formatted data and items
router.get("/:receiptId/details", (req, res) => {
    try {
        const { receiptId } = req.params;

        const receipt = db.prepare(`
            SELECT *
            FROM receipts
            WHERE id = ?
        `).get(receiptId);

        if (!receipt) {
            return res.status(404).json({
                error: "Receipt not found"
            });
        }

        const items = db.prepare(`
            SELECT *
            FROM receipt_items
            WHERE receiptId = ?
            ORDER BY createdAt ASC
        `).all(receiptId);

        res.json({
            receipt: {
                ...receipt,
                ocrJson: receipt.ocrJson ? JSON.parse(receipt.ocrJson) : null
            },
            items
        });
    } catch (error) {
        console.error("GET RECEIPT DETAILS ERROR:", error);

        res.status(500).json({
            error: "Failed to get receipt details"
        });
    }
});

//mt    -- Auto fill formatted receipt data using Gemini
router.post("/:receiptId/auto-fill", async (req, res) => {
    try {
        const { receiptId } = req.params;

        const receipt = db.prepare(`
            SELECT *
            FROM receipts
            WHERE id = ?
        `).get(receiptId);

        if (!receipt) {
            return res.status(404).json({
                error: "Receipt not found"
            });
        }

        if (!receipt.rawText || !receipt.rawText.trim()) {
            return res.status(400).json({
                error: "This receipt has no OCR text to parse"
            });
        }

        const parsedReceiptData = await parseReceiptWithGemini(receipt.rawText);

        res.json({
            message: "Receipt data parsed from OCR",
            parsedData: parsedReceiptData
        });
    } catch (error) {
        console.error("AUTO FILL RECEIPT DATA ERROR:", error);

        res.status(500).json({
            error: "Failed to auto fill receipt data",
            details: error.message
        });
    }
});

//mt    -- Get one receipt by ID
router.get("/:receiptId", (req, res) => {
    try {
        const { receiptId } = req.params;

        const receipt = db.prepare(`
            SELECT *
            FROM receipts
            WHERE id = ?
        `).get(receiptId);

        if (!receipt) {
            return res.status(404).json({
                error: "Receipt not found"
            });
        }

        res.json({
            ...receipt,
            ocrJson: receipt.ocrJson ? JSON.parse(receipt.ocrJson) : null
        });
    } catch (error) {
        console.error("GET SINGLE RECEIPT ERROR:", error);

        res.status(500).json({
            error: "Failed to get receipt"
        });
    }
});

// Delete one receipt
router.delete("/:receiptId", (req, res) => {
    try {
        const { receiptId } = req.params;

        const receipt = db.prepare(`
            SELECT *
            FROM receipts
            WHERE id = ?
        `).get(receiptId);

        if (!receipt) {
            return res.status(404).json({
                error: "Receipt not found"
            });
        }

        const filePath = path.join(uploadDir, receipt.savedFileName);

        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }

        db.prepare(`
            DELETE FROM receipts
            WHERE id = ?
        `).run(receiptId);

        res.json({
            message: "Receipt deleted",
            deletedReceipt: receipt
        });
    } catch (error) {
        console.error("DELETE RECEIPT ERROR:", error);

        res.status(500).json({
            error: "Failed to delete receipt"
        });
    }
});

export default router;