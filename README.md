# Fitness coach backend

A small Node/Express backend for an adaptive AI workout + meal plan coach, gated by Whop.

## What's included

- `server.js` — Express app wiring everything together
- `db.js` — SQLite database (users, plans, chat messages)
- `claude.js` — shared helper that calls the Anthropic API
- `routes/onboard.js` — generates a user's first plan
- `routes/chat.js` — adaptive coaching chat that can update the stored plan
- `routes/plan.js` — fetch a user's current plan + chat history
- `routes/webhook.js` — Whop webhook, verifies signatures and activates accounts on payment

SQLite is used here because it's zero-setup and file-based — great for getting started
and for a single-server deployment. If you outgrow it (multiple servers, high traffic),
swap `db.js` for Postgres; the function signatures can stay the same.

## Local setup

```bash
npm install
cp .env.example .env
# then fill in ANTHROPIC_API_KEY and WHOP_WEBHOOK_SECRET in .env
npm run dev
```

Server runs on `http://localhost:3000` by default.

## API endpoints

- `POST /webhooks/whop` — called by Whop, not by your frontend. Verifies the signature and
  creates/activates a user record.
- `POST /api/onboard` — body `{ userId, goal, equipment, days, diet }`. Generates and saves
  the user's first plan. Requires the user to already exist (i.e. Whop webhook fired first).
- `POST /api/chat` — body `{ userId, message }`. Sends a message to the coach, gets back an
  updated plan + reply, saves both.
- `GET /api/plan/:userId` — returns the current plan and recent chat history.

## Connecting your frontend

Point the React prototype (or whatever frontend you build) at these endpoints instead of
calling the Anthropic API directly. Roughly:

```js
await fetch("https://your-backend.com/api/onboard", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ userId, goal, equipment, days, diet }),
});
```

## Setting up Whop

1. In your Whop dashboard, go to the Developer tab and create a webhook pointed at
   `https://your-backend.com/webhooks/whop`.
2. Subscribe to `membership.activated` (and `payment.succeeded` if you want to react to
   payments directly too).
3. Copy the webhook secret it gives you (`ws_...`) into `WHOP_WEBHOOK_SECRET`.
4. `routes/webhook.js` currently reads `data.user_id || data.member_id || data.id` as the
   unique user identifier — check the actual payload Whop sends for your event (use
   "Send test event" in the dashboard) and adjust the field name if needed.

## Deploying

This runs on any Node host. Two easy options:

- **Railway** — connect your GitHub repo, it detects `npm start` automatically. Add your
  `.env` values as environment variables in the Railway dashboard. Note: SQLite's file
  will reset if the container is redeployed unless you attach a persistent volume — Railway
  supports this under the service's "Volumes" tab.
- **Render** — same idea: connect the repo, add environment variables, add a persistent
  disk for the SQLite file if you stick with SQLite.

## Still missing before this is a real product

- **Real user auth** — right now `userId` is trusted as given. You'll want to issue a
  session token or JWT after the Whop webhook activates a user, and check it on every
  request, rather than trusting whatever `userId` the frontend sends.
- **Rate limiting** — protect `/api/chat` and `/api/onboard` from abuse (a package like
  `express-rate-limit` is a quick start).
- **Monitoring/logging** — at minimum, log errors somewhere you'll see them (Sentry, or
  even just persistent log files) once this has real users.
