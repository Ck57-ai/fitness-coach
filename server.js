require("dotenv").config();
const express = require("express");
const cors = require("cors");

const onboardRoute = require("./routes/onboard");
const chatRoute = require("./routes/chat");
const planRoute = require("./routes/plan");
const webhookRoute = require("./routes/webhook");

const app = express();

app.use(cors());

// The Whop webhook needs the RAW body to verify its signature, so it's
// mounted BEFORE the global express.json() middleware, with its own
// raw-body parser scoped to just this path.
app.use("/webhooks/whop", express.raw({ type: "application/json" }), webhookRoute);

// Everything else can use normal JSON parsing
app.use(express.json());

app.use("/api/onboard", onboardRoute);
app.use("/api/chat", chatRoute);
app.use("/api/plan", planRoute);

app.get("/health", (req, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Fitness coach backend running on port ${PORT}`);
});
