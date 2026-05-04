import express from "express";
import { v4 as uuidv4 } from "uuid";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

import db from "../db.js";

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

//mt     server/uploads/receipts
const uploadDir = path.join(__dirname, "..", "uploads", "receipts");



//mt     GET all receipt groups with receipt count
router.get("/", (req, res) => {
    try {
        const groups = db.prepare(`
            SELECT
                receipt_groups.*,
                COUNT(receipts.id) AS receiptCount
            FROM receipt_groups
            LEFT JOIN receipts
                ON receipt_groups.id = receipts.groupId
            GROUP BY receipt_groups.id
            ORDER BY receipt_groups.createdAt DESC
        `).all();

        res.json(groups);
    } catch (error) {
        console.error("GET GROUPS ERROR:", error);

        res.status(500).json({
            error: "Failed to get receipt groups"
        });
    }
});


//mt     SEARCH receipt groups by title or date
router.get("/search", (req, res) => {
    try {
        const { title, date } = req.query;

        let query = `
            SELECT *
            FROM receipt_groups
            WHERE 1 = 1
        `;

        const params = {};

        if (title) {
            query += ` AND title LIKE @title`;
            params.title = `%${title}%`;
        }

        if (date) {
            query += ` AND createdAt LIKE @date`;
            params.date = `${date}%`;
        }

        query += ` ORDER BY createdAt DESC`;

        const groups = db.prepare(query).all(params);

        res.json(groups);
    } catch (error) {
        console.error("SEARCH GROUPS ERROR:", error);

        res.status(500).json({
            error: "Failed to search receipt groups"
        });
    }
});


//mt     GET one receipt group by ID
router.get("/:groupId", (req, res) => {
    try {
        const { groupId } = req.params;

        const group = db.prepare(`
            SELECT *
            FROM receipt_groups
            WHERE id = ?
        `).get(groupId);

        if (!group) {
            return res.status(404).json({
                error: "Receipt group not found"
            });
        }

        res.json(group);
    } catch (error) {
        console.error("GET SINGLE GROUP ERROR:", error);

        res.status(500).json({
            error: "Failed to get receipt group"
        });
    }
});


//mt     CREATE receipt group
router.post("/", (req, res) => {
    try {
        const { title } = req.body;

        if (!title || title.trim() === "") {
            return res.status(400).json({
                error: "Group title is required"
            });
        }

        const newGroup = {
            id: uuidv4(),
            title: title.trim(),
            createdAt: new Date().toISOString(),
            updatedAt: null
        };

        db.prepare(`
            INSERT INTO receipt_groups (
                id,
                title,
                createdAt,
                updatedAt
            )
            VALUES (
                @id,
                @title,
                @createdAt,
                @updatedAt
            )
        `).run(newGroup);

        res.status(201).json({
            message: "Receipt group created",
            group: newGroup
        });
    } catch (error) {
        console.error("CREATE GROUP ERROR:", error);

        res.status(500).json({
            error: "Failed to create receipt group"
        });
    }
});


//mt DELETE receipt group
router.delete("/:groupId", (req, res) => {
    try {
        const { groupId } = req.params;

        const group = db.prepare(`
            SELECT *
            FROM receipt_groups
            WHERE id = ?
        `).get(groupId);

        if (!group) {
            return res.status(404).json({
                error: "Receipt group not found"
            });
        }

        //st -- Get all receipts in this group before deleting DB records
        const receipts = db.prepare(`
            SELECT *
            FROM receipts
            WHERE groupId = ?
        `).all(groupId);

        //st -- Delete image files from uploads folder
        receipts.forEach((receipt) => {
            const filePath = path.join(uploadDir, receipt.savedFileName);

            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        });

        //st -- Delete group
        // Because db.js uses ON DELETE CASCADE,
        // this also deletes all receipts connected to this group.
        db.prepare(`
            DELETE FROM receipt_groups
            WHERE id = ?
        `).run(groupId);

        res.json({
            message: "Receipt group deleted",
            deletedGroup: group,
            deletedReceiptCount: receipts.length
        });
    } catch (error) {
        console.error("DELETE GROUP ERROR:", error);

        res.status(500).json({
            error: "Failed to delete receipt group"
        });
    }
});


export default router;