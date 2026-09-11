const PLAN_SCHEMA = `Respond with ONLY a JSON object, no other text, in exactly this shape:
{"reply":"a short coach message, under 60 words","plan":{"workouts":[{"day":"Mon","focus":"Push","exercises":["Bench press 3x8","Incline DB press 3x10"]}],"meals":[{"name":"Breakfast","items":"short description"}]}}
Rules: at most 6 workout entries, at most 6 exercises each, at most 5 meal entries. No markdown, no code fences, no text outside the JSON object.`;

function extractJSON(raw) {
  const cleaned = raw.replace(/```json|```/g, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  return JSON.parse(cleaned.slice(start, end + 1));
}

async function callClaude(system, userText) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is not set in the environment");
  }

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 1200,
      system,
      messages: [{ role: "user", content: userText }],
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Anthropic API error (${res.status}): ${errText}`);
  }

  const data = await res.json();
  const textBlock = (data.content || []).find((b) => b.type === "text");
  if (!textBlock) throw new Error("No text content in Claude's response");
  return extractJSON(textBlock.text);
}

module.exports = { callClaude, PLAN_SCHEMA };
