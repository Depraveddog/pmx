import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function generateWithFallback(prompt) {
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const result = await model.generateContent(prompt);
      return result.response.text();
    } catch (err) {
      if (err.status === 503 && attempt < 3) {
        await new Promise((r) => setTimeout(r, attempt * 1000));
        continue;
      }
      throw err;
    }
  }
}

function stripJsonFences(raw) {
  return raw
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { projectName, budget, duration, objective, constraints } = body;

    const ctx = `
Project name: ${projectName || "Not specified"}
Budget: ${budget || "Not specified"}
Duration (weeks): ${duration || "Not specified"}
Objective / business goal: ${objective || "Not specified"}
Key constraints: ${constraints || "Not specified"}
    `.trim();

    const charterText = await generateWithFallback(`Write a project charter:\n${ctx}`);

    let risks = [];
    let wbs = [];
    let tasks = [];

    try {
      const risksRaw = await generateWithFallback(`Return risks JSON:\n${ctx}`);
      risks = JSON.parse(stripJsonFences(risksRaw));
    } catch { }

    try {
      const wbsRaw = await generateWithFallback(`Return WBS JSON:\n${ctx}`);
      const parsed = JSON.parse(stripJsonFences(wbsRaw));
      wbs = parsed.wbs || [];
      tasks = parsed.tasks || [];
    } catch { }

    return Response.json({ charter: charterText, risks, wbs, tasks });

  } catch (err) {
    return Response.json(
      { error: err.message || "Failed to generate" },
      { status: 500 }
    );
  }
}