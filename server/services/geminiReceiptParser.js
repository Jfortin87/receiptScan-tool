import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

const receiptSchema = {
    type: "object",
    properties: {
        storeName: {
            type: "string",
            description: "The store or dispensary name. Use an empty string if missing."
        },

        receiptDate: {
            type: "string",
            description: "Receipt date in YYYY-MM-DD format. Use an empty string if missing."
        },

        orderNumber: {
            type: "string",
            description: "Order number, transaction number, or receipt number. Use an empty string if missing."
        },

        cashierNumber: {
            type: "string",
            description: "Cashier number or cashier ID. Use an empty string if missing."
        },

        customerNumber: {
            type: "string",
            description: "Customer number, patient number, or customer ID. Use an empty string if missing."
        },

        phoneNumber: {
            type: "string",
            description: "Store phone number. Use an empty string if missing."
        },

        subTotal: {
            type: "number",
            description: "Subtotal amount before tax and discounts. Use 0 if missing."
        },

        cannabisExciseTax: {
            type: "number",
            description: "Cannabis excise tax amount. Use 0 if missing."
        },

        localTax: {
            type: "number",
            description: "Local tax amount. Use 0 if missing."
        },

        maSalesTax: {
            type: "number",
            description: "Massachusetts sales tax amount. Use 0 if missing."
        },

        totalTax: {
            type: "number",
            description: "Total tax amount. Use 0 if missing."
        },

        discount: {
            type: "number",
            description: "Discount amount. Use 0 if missing."
        },

        grandTotal: {
            type: "number",
            description: "Final grand total / amount paid / total due. Use 0 if missing."
        },

        totalItems: {
            type: "number",
            description: "Total number of items on the receipt. Use 0 if missing."
        },

        totalGrams: {
            type: "number",
            description: "Total cannabis grams purchased. Use 0 if missing."
        },

        startingAllotment: {
            type: "number",
            description: "Starting allotment amount in grams. Use 0 if missing."
        },

        remainingAllotment: {
            type: "number",
            description: "Remaining allotment amount in grams. Use 0 if missing."
        },

        items: {
            type: "array",
            description: "Receipt item rows found in the OCR text.",
            items: {
                type: "object",
                properties: {
                    itemName: {
                        type: "string",
                        description: "Item/product name. Use an empty string if missing."
                    },

                    itemDetails: {
                        type: "string",
                        description: "Item details such as strain, package size, THC info, or product notes. Use an empty string if missing."
                    },

                    itemPrice: {
                        type: "number",
                        description: "Single item price. Use 0 if missing."
                    },

                    itemQuantity: {
                        type: "number",
                        description: "Quantity or total items for this line. Use 0 if missing."
                    },

                    itemGrams: {
                        type: "number",
                        description: "Grams for this item line. Use 0 if missing."
                    },

                    itemTotal: {
                        type: "number",
                        description: "Line total for this item. Use 0 if missing."
                    }
                },
                required: [
                    "itemName",
                    "itemDetails",
                    "itemPrice",
                    "itemQuantity",
                    "itemGrams",
                    "itemTotal"
                ]
            }
        }
    },
    required: [
        "storeName",
        "receiptDate",
        "orderNumber",
        "cashierNumber",
        "customerNumber",
        "phoneNumber",
        "subTotal",
        "cannabisExciseTax",
        "localTax",
        "maSalesTax",
        "totalTax",
        "discount",
        "grandTotal",
        "totalItems",
        "totalGrams",
        "startingAllotment",
        "remainingAllotment",
        "items"
    ]
};


// mt -- Clean number values from AI before sending to frontend
function cleanNumber(value) {
    const numberValue = Number(value);

    if (Number.isNaN(numberValue)) {
        return 0;
    }

    return numberValue;
}


// mt -- Clean string values from AI before sending to frontend
function cleanString(value) {
    if (typeof value !== "string") {
        return "";
    }

    return value.trim();
}


// mt -- Main Gemini parser function
export async function parseReceiptWithGemini(rawText = "") {
    if (!process.env.GEMINI_API_KEY) {
        throw new Error("Missing GEMINI_API_KEY in .env file");
    }

    if (!rawText.trim()) {
        throw new Error("No raw OCR text found for this receipt");
    }

    const ai = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY
    });

    const prompt = `
You are a receipt data extraction assistant.

Your job:
Extract structured data from raw OCR text from a cannabis dispensary receipt.

Important rules:
- Return only the structured JSON that matches the schema.
- Do not guess values that are not present.
- If a text field is missing, return an empty string.
- If a number field is missing, return 0.
- Dates must be returned as YYYY-MM-DD.
- Money values must be plain numbers only. Example: 12.34
- Do not include dollar signs.
- Do not include commas.
- For items, extract as many item rows as you can confidently find.
- If item rows are unclear, return an empty items array.

Raw OCR text:
${rawText}
`;

    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseJsonSchema: receiptSchema
        }
    });

    const parsed = JSON.parse(response.text);

    return {
        storeName: cleanString(parsed.storeName),
        receiptDate: cleanString(parsed.receiptDate),
        orderNumber: cleanString(parsed.orderNumber),
        cashierNumber: cleanString(parsed.cashierNumber),
        customerNumber: cleanString(parsed.customerNumber),
        phoneNumber: cleanString(parsed.phoneNumber),

        subTotal: cleanNumber(parsed.subTotal),
        cannabisExciseTax: cleanNumber(parsed.cannabisExciseTax),
        localTax: cleanNumber(parsed.localTax),
        maSalesTax: cleanNumber(parsed.maSalesTax),
        totalTax: cleanNumber(parsed.totalTax),
        discount: cleanNumber(parsed.discount),
        grandTotal: cleanNumber(parsed.grandTotal),

        totalItems: cleanNumber(parsed.totalItems),
        totalGrams: cleanNumber(parsed.totalGrams),
        startingAllotment: cleanNumber(parsed.startingAllotment),
        remainingAllotment: cleanNumber(parsed.remainingAllotment),

        items: Array.isArray(parsed.items)
            ? parsed.items.map((item) => ({
                itemName: cleanString(item.itemName),
                itemDetails: cleanString(item.itemDetails),
                itemPrice: cleanNumber(item.itemPrice),
                itemQuantity: cleanNumber(item.itemQuantity),
                itemGrams: cleanNumber(item.itemGrams),
                itemTotal: cleanNumber(item.itemTotal)
            }))
            : []
    };
}