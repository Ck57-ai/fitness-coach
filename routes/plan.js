const express = require("express");
const router = express.Router();
const db = require("../db");

// GET /api/plan/:userId
router.get("/:userId", (req, res) => {
  const { userId } = req.params;
  const plan = db.getPlan(userId);
  if (!plan) {
    return res.status(404).json({ error: "No plan found for this user yet." });
  }
  const messages = db.getRecentMessages(userId, 50);
  res.json({ plan, messages });
});

module.exports = router;
