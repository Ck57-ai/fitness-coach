const express = require("express");
const router = express.Router();
const db = require("../db");
const { callClaude, PLAN_SCHEMA } = require("../claude");

// POST /api/onboard
// body: { userId, goal, equipment, days, diet }
router.post("/", async (req, res) => {
  const { userId, goal, equipment, days, diet } = req.body;

  if (!userId) {
    return res.status(400).json({ error: "userId is required" });
  }
  if (!db.userExists(userId)) {
    return res.status(403).json({ error: "Unknown user. Has this account been activated via Whop?" });
  }

  try {
    const system = `You are an AI fitness and nutrition coach setting up a new client's first plan. ${PLAN_SCHEMA}`;
    const userText = `Goal: ${goal}. Equipment: ${equipment}. Days available per week: ${days}. Dietary notes: ${
      diet || "none"
    }. Create their first workout and meal plan, and greet them briefly in "reply".`;

    const result = await callClaude(system, userText);

    db.savePlan(userId, result.plan);
    db.addMessage(userId, "coach", result.reply);

    res.json({ plan: result.plan, reply: result.reply });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to generate plan" });
  }
});

module.exports = router;
