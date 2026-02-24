// api/assistant.js  –  Vercel Serverless Function
// PMX AI Assistant — answers project management questions using Gemini

import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY;
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

export default async function handler(req, res) {
    if (req.method !== "POST") {
        res.setHeader("Allow", "POST");
        return res.status(405).json({ error: "Method not allowed" });
    }

    if (!genAI) {
        return res.status(500).json({ error: "GEMINI_API_KEY is not configured" });
    }

    try {
        const { message, history } = req.body;

        if (!message) {
            return res.status(400).json({ error: "No message provided" });
        }

        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        const systemPrompt = `You are PMX Assistant, an expert AI project management advisor built into the PMX project management platform.

Your capabilities:
- Help users plan, manage, and execute projects
- Advise on risk management, stakeholder engagement, and scope control
- Provide guidance on Agile, Waterfall, Hybrid, and other PM methodologies
- Help write project charters, WBS, risk registers, and status reports
- Answer questions about budgeting, scheduling, resource allocation, and quality management
- Suggest best practices and industry standards (PMBOK, PRINCE2, Agile frameworks)

Rules:
- Be concise but thorough
- Use bullet points and structured formatting when helpful
- If the user asks about a specific project, work with whatever context they provide
- Be practical and actionable — give specific advice, not generic platitudes
- Use markdown formatting (bold, bullets) for readability`;

        // Build the full prompt with conversation history
        let fullPrompt = systemPrompt + "\n\n";

        // Add conversation history
        if (history && history.length > 0) {
            fullPrompt += "Previous conversation:\n";
            for (const msg of history) {
                const role = msg.role === "user" ? "User" : "Assistant";
                fullPrompt += `${role}: ${msg.content}\n\n`;
            }
        }

        fullPrompt += `User: ${message}\n\nAssistant:`;

        const result = await model.generateContent(fullPrompt);
        const reply = result.response.text();

        res.json({ reply });
    } catch (err) {
        console.error("Assistant error:", err);
        const status = err.status === 503 ? 503 : 500;
        res.status(status).json({
            error: err.message || "Failed to get a response. Please try again.",
        });
    }
}
