const express = require("express");
const router = express.Router();
const db = require("../db");
const { callClaude, PLAN_SCHEMA } = require("../claude");

// POST /api/chat
// body: { userId, message }
router.post("/", async (req, res) => {
  const { userId, message } = req.body;

  if (!userId || !message) {
    return res.status(400).json({ error: "userId and message are required" });
  }

  const plan = db.getPlan(userId);
  if (!plan) {
    return res.status(404).json({ error: "No plan found for this user yet. Call /api/onboard first." });
  }

  db.addMessage(userId, "user", message);

  try {
    const history = db
      .getRecentMessages(userId, 10)
      .map((m) => `${m.role === "user" ? "Client" : "Coach"}: ${m.text}`)
      .join("\n");

    const system = `You are an adaptive AI fitness and nutrition coach. The client already has a current plan, given as JSON below. Update it only if the conversation calls for a change; otherwise keep it identical. ${PLAN_SCHEMA}`;
    const userText = `Current plan JSON: ${JSON.stringify(
      plan
    )}\n\nRecent conversation:\n${history}\n\nRespond to the client's latest message.`;

    const result = await callClaude(system, userText);

    db.savePlan(userId, result.plan);
    db.addMessage(userId, "coach", result.reply);

    res.json({ plan: result.plan, reply: result.reply });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Coach failed to respond" });
  }
});

module.exports = router;
