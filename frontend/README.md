# Fitness coach frontend

A React (Vite) frontend for the adaptive AI fitness coach. This talks to the
`fitness-coach-backend` API instead of calling Claude directly.

## Local setup

```bash
npm install
cp .env.example .env
# edit .env and point VITE_API_URL at your backend (local or deployed)
npm run dev
```

Opens at `http://localhost:5173` by default.

## Testing locally, before Whop is wired up

The backend only lets a `userId` onboard if that user already exists (normally created by
the Whop webhook when someone pays). To test without a real purchase, add yourself directly
to the backend's database:

```bash
# from inside the fitness-coach-backend folder, with the server stopped
sqlite3 data.sqlite "INSERT INTO users (id) VALUES ('test-user');"
```

Then open the frontend with `http://localhost:5173/?userId=test-user`.

## How it identifies users

Right now it reads `?userId=...` from the URL (and remembers it in the browser after that).
In production this should come from wherever Whop tells you who's logged in — either Whop's
embed context if you run this inside a Whop app page, or your own login step after checkout.
Swap the logic in `getUserId()` inside `src/App.jsx` once you know which approach you're using.

## Deploying

1. Push this folder to GitHub (see the main project README for git basics).
2. On Vercel (or Netlify), import the repo. Framework preset: Vite. Build command:
   `npm run build`. Output directory: `dist`.
3. Add an environment variable `VITE_API_URL` set to your deployed backend's URL.
4. Deploy — you'll get a public URL you can link from Whop, or embed as a Whop app.
