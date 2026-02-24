// api/extract-pdf.js  –  Vercel Serverless Function
// Accepts a base64-encoded PDF, sends it to Gemini for extraction,
// and returns structured project data to auto-fill the form.

import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY;
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

export const config = {
    api: {
        bodyParser: {
            sizeLimit: "10mb",
        },
    },
};

export default async function handler(req, res) {
    if (req.method !== "POST") {
        res.setHeader("Allow", "POST");
        return res.status(405).json({ error: "Method not allowed" });
    }

    if (!genAI) {
        return res.status(500).json({ error: "GEMINI_API_KEY is not configured" });
    }

    try {
        const { fileBase64, mimeType } = req.body;

        if (!fileBase64) {
            return res.status(400).json({ error: "No file data provided" });
        }

        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        const prompt = `You are a project management expert. Analyze this uploaded document and extract the following project details.

Return ONLY valid JSON (no backticks, no explanation) in this exact format:
{
  "projectName": "Name of the project",
  "budget": "Budget amount as a plain number string (no currency symbols, no commas)",
  "duration": "Duration in weeks as a plain number string",
  "projectType": "IT | Infrastructure | Construction | Other",
  "objective": "The project objective or business goal (1-3 sentences)",
  "constraints": "Key constraints mentioned in the document (1-3 sentences)"
}

Rules:
- Extract as much information as possible from the document.
- If a field is not mentioned in the document, use an empty string "".
- For budget, convert to a plain number (e.g., "$1,500,000" → "1500000").
- For duration, estimate in weeks if given in months/years (e.g., "6 months" → "24").
- For projectType, choose the closest match from: IT, Infrastructure, Construction, Other.
- Be concise but informative for objective and constraints.`;

        const result = await model.generateContent([
            prompt,
            {
                inlineData: {
                    mimeType: mimeType || "application/pdf",
                    data: fileBase64,
                },
            },
        ]);

        const rawText = result.response.text();
        const cleaned = rawText
            .trim()
            .replace(/^```(?:json)?\s*/i, "")
            .replace(/\s*```$/, "")
            .trim();

        const extracted = JSON.parse(cleaned);

        // Format budget with commas if it's a number
        if (extracted.budget) {
            const num = extracted.budget.replace(/\D/g, "");
            extracted.budget = num.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
        }

        res.json(extracted);
    } catch (err) {
        console.error("Error extracting PDF:", err);
        res.status(500).json({
            error: err.message || "Failed to extract document content. Please try again.",
        });
    }
}
