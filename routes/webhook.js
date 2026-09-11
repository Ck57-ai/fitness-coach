const express = require("express");
const crypto = require("crypto");
const router = express.Router();
const db = require("../db");

// Whop webhooks use the Standard Webhooks spec:
// signed string is "{webhook-id}.{webhook-timestamp}.{raw body}", HMAC-SHA256,
// keyed with your ws_... secret, sent as base64 in the "webhook-signature" header
// formatted as "v1,<signature>". See https://docs.whop.com/developer/guides/webhooks
function verifyWhopSignature(rawBody, headers, secret) {
  const id = headers["webhook-id"];
  const timestamp = headers["webhook-timestamp"];
  const signatureHeader = headers["webhook-signature"];

  if (!id || !timestamp || !signatureHeader) return false;

  // Reject anything older than 5 minutes to prevent replay attacks
  const nowSeconds = Math.floor(Date.now() / 1000);
  if (Math.abs(nowSeconds - Number(timestamp)) > 300) return false;

  const signedContent = `${id}.${timestamp}.${rawBody}`;
  const expected = crypto
    .createHmac("sha256", secret)
    .update(signedContent)
    .digest("base64");

  // webhook-signature can contain multiple space-separated "v1,<sig>" values
  const candidates = signatureHeader
    .split(" ")
    .map((s) => s.split(",")[1])
    .filter(Boolean);

  return candidates.some((sig) => {
    try {
      return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
    } catch {
      return false;
    }
  });
}

// This route must receive the RAW body (see server.js, which mounts it with express.raw)
router.post("/", (req, res) => {
  const secret = process.env.WHOP_WEBHOOK_SECRET;
  const rawBody = req.body.toString("utf8");

  if (!secret || !verifyWhopSignature(rawBody, req.headers, secret)) {
    return res.status(401).json({ error: "Invalid signature" });
  }

  const event = JSON.parse(rawBody);

  // Activate access when a membership goes live or a payment succeeds.
  // Adjust to whichever events you actually subscribe to in the Whop dashboard.
  if (event.type === "membership.activated" || event.type === "payment.succeeded") {
    const data = event.data || {};
    const userId = data.user_id || data.member_id || data.id;
    const email = data.email || null;
    if (userId) {
      db.upsertUser(userId, email);
    }
  }

  // Respond fast - Whop expects a 2xx within 5 seconds
  res.status(200).send("OK");
});

module.exports = router;
