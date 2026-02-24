// api/generate-charter.js  –  Vercel Serverless Function
import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY;
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

// ── helpers ──────────────────────────────────────────────────────────────────

async function generateWithFallback(prompt) {
    if (!genAI) throw new Error("GEMINI_API_KEY is not configured");

    const modelNames = ["gemini-2.5-flash"];

    for (const name of modelNames) {
        const model = genAI.getGenerativeModel({ model: name });

        for (let attempt = 1; attempt <= 3; attempt++) {
            try {
                const result = await model.generateContent(prompt);
                return result.response.text();
            } catch (err) {
                if (err.status === 503 && attempt < 3) {
                    await new Promise((r) => setTimeout(r, attempt * 1000));
                    continue;
                }
                if (err.status === 503) break;
                throw err;
            }
        }
    }

    throw new Error(
        "All available AI models are temporarily overloaded. Please try again later."
    );
}

function stripJsonFences(raw) {
    return raw
        .trim()
        .replace(/^```(?:json)?\s*/i, "")
        .replace(/\s*```$/, "")
        .trim();
}

// ── handler ──────────────────────────────────────────────────────────────────

export default async function handler(req, res) {
    // Only allow POST
    if (req.method !== "POST") {
        res.setHeader("Allow", "POST");
        return res.status(405).json({ error: "Method not allowed" });
    }

    try {
        const { projectName, budget, duration, objective, constraints } = req.body;

        const ctx = `
Project name: ${projectName || "Not specified"}
Budget: ${budget || "Not specified"}
Duration (weeks): ${duration || "Not specified"}
Objective / business goal: ${objective || "Not specified"}
Key constraints: ${constraints || "Not specified"}
    `.trim();

        // ── 1. Charter ────────────────────────────────────────────────────────
        const charterPrompt = `
You are a professional project manager.

Using the inputs below, write a concise but structured project charter.
Include sections:
- Project Overview
- Objectives
- Scope (In Scope / Out of Scope)
- High-Level Timeline & Phases
- Key Stakeholders (generic roles)
- Key Risks & High-Level Responses
- Assumptions
- Constraints

${ctx}
    `.trim();

        const charterText = await generateWithFallback(charterPrompt);

        // ── 2. Risks ──────────────────────────────────────────────────────────
        const riskPrompt = `
You are a project risk management expert.

Based on the following project information, identify 5–8 key project risks (threats only).

${ctx}

Return ONLY a valid JSON array (no backticks, no explanation) in this exact format:
[
  {
    "id": "R1",
    "description": "Short one-line risk description",
    "category": "Scope | Schedule | Cost | Quality | Resource | Stakeholder | Technical | Other",
    "impact": "Low | Medium | High",
    "probability": "Low | Medium | High",
    "response": "Short one-line recommended response strategy",
    "owner": "Role responsible (e.g., Project Manager, Sponsor, Tech Lead)"
  }
]
    `.trim();

        let risks = [];
        try {
            const risksRaw = await generateWithFallback(riskPrompt);
            risks = JSON.parse(stripJsonFences(risksRaw));
        } catch (e) {
            console.error("Failed to parse risks JSON:", e);
            risks = [
                {
                    id: "R1",
                    description:
                        "Scope may expand beyond initial objectives if requirements are unclear.",
                    category: "Scope",
                    impact: "High",
                    probability: "Medium",
                    response:
                        "Define a clear scope baseline and implement change control.",
                    owner: "Project Manager",
                },
            ];
        }

        // ── 3. WBS Phases + Kanban Tasks ──────────────────────────────────────
        const wbsPrompt = `
You are a project manager creating a Work Breakdown Structure and an initial task list.

Based on the project below, return ONLY valid JSON (no backticks, no prose) with this exact structure:

{
  "wbs": [
    {
      "id": "1",
      "name": "Phase name",
      "startWeek": 0,
      "durationWeeks": 2,
      "items": ["1.1 Deliverable or task", "1.2 Deliverable or task"]
    }
  ],
  "tasks": [
    { "id": 1, "title": "Short actionable task title" }
  ]
}

Rules:
- Generate 4–6 WBS phases that fit within ${duration || "12"} weeks total. startWeek and durationWeeks must be integers and must not exceed the total duration.
- Generate 6–10 Kanban tasks (the most important early actions). Start task IDs at 1.
- Make everything specific to the project described.
- Return ONLY the JSON object, nothing else.

${ctx}
    `.trim();

        let wbs = [];
        let tasks = [];
        try {
            const wbsRaw = await generateWithFallback(wbsPrompt);
            const parsed = JSON.parse(stripJsonFences(wbsRaw));
            wbs = parsed.wbs || [];
            tasks = parsed.tasks || [];
        } catch (e) {
            console.error("Failed to parse WBS/tasks JSON:", e);
            wbs = [
                {
                    id: "1",
                    name: "Initiation",
                    startWeek: 0,
                    durationWeeks: 1,
                    items: ["1.1 Define project scope", "1.2 Identify stakeholders"],
                },
                {
                    id: "2",
                    name: "Planning",
                    startWeek: 1,
                    durationWeeks: 2,
                    items: ["2.1 Create project plan", "2.2 Risk assessment"],
                },
                {
                    id: "3",
                    name: "Execution",
                    startWeek: 3,
                    durationWeeks: 5,
                    items: ["3.1 Deliver core work", "3.2 Track progress"],
                },
                {
                    id: "4",
                    name: "Closure",
                    startWeek: 8,
                    durationWeeks: 1,
                    items: ["4.1 Final review", "4.2 Handover"],
                },
            ];
            tasks = [
                { id: 1, title: "Define project scope" },
                { id: 2, title: "Identify key stakeholders" },
                { id: 3, title: "Create project plan" },
            ];
        }

        res.json({ charter: charterText, risks, wbs, tasks });
    } catch (err) {
        console.error("Error generating charter/risks/wbs:", err);
        const status = err.status === 503 ? 503 : 500;
        res.status(status).json({
            error: err.message || "Failed to generate. Please try again shortly.",
        });
    }
}
