const Database = require("better-sqlite3");
const path = require("path");

const db = new Database(path.join(__dirname, "data.sqlite"));

db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,          -- Whop user id (or email as a fallback)
    email TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS plans (
    user_id TEXT PRIMARY KEY REFERENCES users(id),
    plan_json TEXT NOT NULL,
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL REFERENCES users(id),
    role TEXT NOT NULL,           -- 'user' or 'coach'
    text TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  );
`);

function upsertUser(id, email) {
  db.prepare(
    `INSERT INTO users (id, email) VALUES (?, ?)
     ON CONFLICT(id) DO UPDATE SET email = excluded.email`
  ).run(id, email || null);
}

function savePlan(userId, plan) {
  db.prepare(
    `INSERT INTO plans (user_id, plan_json, updated_at) VALUES (?, ?, datetime('now'))
     ON CONFLICT(user_id) DO UPDATE SET plan_json = excluded.plan_json, updated_at = datetime('now')`
  ).run(userId, JSON.stringify(plan));
}

function getPlan(userId) {
  const row = db.prepare(`SELECT plan_json FROM plans WHERE user_id = ?`).get(userId);
  return row ? JSON.parse(row.plan_json) : null;
}

function addMessage(userId, role, text) {
  db.prepare(`INSERT INTO messages (user_id, role, text) VALUES (?, ?, ?)`).run(userId, role, text);
}

function getRecentMessages(userId, limit = 10) {
  const rows = db
    .prepare(
      `SELECT role, text FROM messages WHERE user_id = ? ORDER BY id DESC LIMIT ?`
    )
    .all(userId, limit);
  return rows.reverse();
}

function userExists(userId) {
  return !!db.prepare(`SELECT 1 FROM users WHERE id = ?`).get(userId);
}

module.exports = {
  upsertUser,
  savePlan,
  getPlan,
  addMessage,
  getRecentMessages,
  userExists,
};
