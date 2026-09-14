import { useState, useRef, useEffect } from "react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

const INK = "#15171B";
const SURFACE = "#1D2025";
const SURFACE_2 = "#252932";
const ACCENT = "#C8FF4D";
const TEXT = "#ECEAE3";
const MUTED = "#8A8D93";
const LINE = "#33363E";

function getUserId() {
  // In production, Whop should tell you who's logged in (via its embed context
  // or your own login flow tied to the account your webhook created). For now,
  // this reads ?userId=... from the URL, or falls back to a value saved locally
  // so a returning visitor keeps the same account during testing.
  const fromUrl = new URLSearchParams(window.location.search).get("userId");
  if (fromUrl) {
    localStorage.setItem("userId", fromUrl);
    return fromUrl;
  }
  return localStorage.getItem("userId");
}

export default function App() {
  const [userId, setUserId] = useState(getUserId());
  const [stage, setStage] = useState("loading"); // loading | needsUser | intake | dashboard
  const [form, setForm] = useState({
    goal: "Build muscle",
    equipment: "Home (dumbbells)",
    days: "4",
    diet: "",
  });
  const [plan, setPlan] = useState(null);
  const [chat, setChat] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chat, loading]);

  useEffect(() => {
    if (!userId) {
      setStage("needsUser");
      return;
    }
    (async () => {
      try {
        const res = await fetch(`${API_URL}/api/plan/${userId}`);
        if (res.status === 404) {
          setStage("intake");
          return;
        }
        if (!res.ok) throw new Error("Failed to load");
        const data = await res.json();
        setPlan(data.plan);
        setChat(
          data.messages.map((m) => ({
            role: m.role === "user" ? "user" : "coach",
            text: m.text,
          }))
        );
        setStage("dashboard");
      } catch (err) {
        setError("Couldn't reach the server. Is the backend running?");
        setStage("intake");
      }
    })();
  }, [userId]);

  async function generateInitialPlan(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_URL}/api/onboard`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, ...form }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to generate plan");
      }
      const result = await res.json();
      setPlan(result.plan);
      setChat([{ role: "coach", text: result.reply }]);
      setStage("dashboard");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function sendMessage(e) {
    e.preventDefault();
    const text = input.trim();
    if (!text) return;
    setInput("");
    setError("");
    setChat((c) => [...c, { role: "user", text }]);
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, message: text }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Coach failed to respond");
      }
      const result = await res.json();
      setPlan(result.plan);
      setChat((c) => [...c, { role: "coach", text: result.reply }]);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (stage === "loading") {
    return <div style={styles.page} />;
  }

  if (stage === "needsUser") {
    return (
      <div style={styles.page}>
        <div style={styles.intakeWrap}>
          <h1 style={styles.h1}>No account found</h1>
          <p style={styles.sub}>
            This app expects a <code>userId</code> to be provided (normally passed by Whop
            after purchase). Open this page with <code>?userId=YOUR_ID</code> in the URL,
            where <code>YOUR_ID</code> matches an account your backend's Whop webhook has
            already activated.
          </p>
        </div>
      </div>
    );
  }

  if (stage === "intake") {
    return (
      <div style={styles.page}>
        <div style={styles.intakeWrap}>
          <h1 style={styles.h1}>Set up your plan</h1>
          <p style={styles.sub}>
            A few details, and your coach builds a workout and meal plan you can adjust
            anytime by chatting.
          </p>
          <form onSubmit={generateInitialPlan} style={styles.form}>
            <label style={styles.label}>
              Goal
              <select
                style={styles.input}
                value={form.goal}
                onChange={(e) => setForm({ ...form, goal: e.target.value })}
              >
                <option>Build muscle</option>
                <option>Lose fat</option>
                <option>General fitness</option>
                <option>Improve endurance</option>
              </select>
            </label>
            <label style={styles.label}>
              Equipment
              <select
                style={styles.input}
                value={form.equipment}
                onChange={(e) => setForm({ ...form, equipment: e.target.value })}
              >
                <option>None (bodyweight)</option>
                <option>Home (dumbbells)</option>
                <option>Full gym</option>
              </select>
            </label>
            <label style={styles.label}>
              Days per week
              <select
                style={styles.input}
                value={form.days}
                onChange={(e) => setForm({ ...form, days: e.target.value })}
              >
                <option>2</option>
                <option>3</option>
                <option>4</option>
                <option>5</option>
                <option>6</option>
              </select>
            </label>
            <label style={styles.label}>
              Dietary notes (optional)
              <input
                style={styles.input}
                placeholder="vegetarian, no dairy, etc."
                value={form.diet}
                onChange={(e) => setForm({ ...form, diet: e.target.value })}
              />
            </label>
            <button type="submit" style={styles.cta} disabled={loading}>
              {loading ? "Building your plan…" : "Build my plan"}
            </button>
            {error && <p style={styles.error}>{error}</p>}
          </form>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.dashboard}>
        <div style={styles.planCol}>
          <h2 style={styles.h2}>Your plan</h2>
          <div style={styles.cardGroup}>
            {plan?.workouts?.map((w, i) => (
              <div key={i} style={styles.card}>
                <div style={styles.cardTitleRow}>
                  <span style={styles.cardDay}>{w.day}</span>
                  <span style={styles.cardFocus}>{w.focus}</span>
                </div>
                <ul style={styles.list}>
                  {w.exercises?.map((ex, j) => (
                    <li key={j} style={styles.listItem}>
                      {ex}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <h2 style={{ ...styles.h2, marginTop: 28 }}>Meals</h2>
          <div style={styles.cardGroup}>
            {plan?.meals?.map((m, i) => (
              <div key={i} style={styles.mealCard}>
                <span style={styles.mealName}>{m.name}</span>
                <span style={styles.mealItems}>{m.items}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={styles.chatCol}>
          <h2 style={styles.h2}>Coach chat</h2>
          <div style={styles.chatLog} ref={scrollRef}>
            {chat.map((m, i) => (
              <div key={i} style={m.role === "user" ? styles.bubbleUser : styles.bubbleCoach}>
                {m.text}
              </div>
            ))}
            {loading && <div style={styles.bubbleCoach}>Thinking…</div>}
          </div>
          {error && <p style={styles.error}>{error}</p>}
          <form onSubmit={sendMessage} style={styles.chatForm}>
            <input
              style={styles.chatInput}
              placeholder="Ask for a swap, log progress, or adjust your plan…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
            />
            <button type="submit" style={styles.sendBtn} disabled={loading}>
              Send
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background: INK,
    color: TEXT,
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    padding: "32px 20px",
  },
  intakeWrap: { maxWidth: 460, margin: "0 auto" },
  h1: { fontSize: 30, fontWeight: 700, letterSpacing: "-0.02em", margin: 0 },
  sub: { color: MUTED, fontSize: 15, lineHeight: 1.6, marginTop: 10 },
  form: { display: "flex", flexDirection: "column", gap: 16, marginTop: 24 },
  label: { display: "flex", flexDirection: "column", gap: 6, fontSize: 13, color: MUTED },
  input: {
    background: SURFACE,
    border: `1px solid ${LINE}`,
    borderRadius: 8,
    padding: "10px 12px",
    color: TEXT,
    fontSize: 15,
    outline: "none",
  },
  cta: {
    marginTop: 8,
    background: ACCENT,
    color: "#16210A",
    border: "none",
    borderRadius: 8,
    padding: "12px 16px",
    fontSize: 15,
    fontWeight: 700,
    cursor: "pointer",
  },
  error: { color: "#F0997B", fontSize: 13, marginTop: 4 },
  dashboard: {
    maxWidth: 920,
    margin: "0 auto",
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 28,
  },
  planCol: {},
  chatCol: { display: "flex", flexDirection: "column" },
  h2: { fontSize: 18, fontWeight: 700, margin: "0 0 14px" },
  cardGroup: { display: "flex", flexDirection: "column", gap: 10 },
  card: { background: SURFACE, border: `1px solid ${LINE}`, borderRadius: 10, padding: 14 },
  cardTitleRow: { display: "flex", justifyContent: "space-between", marginBottom: 8 },
  cardDay: { fontWeight: 700, fontSize: 14 },
  cardFocus: { color: ACCENT, fontSize: 13, fontWeight: 500 },
  list: { margin: 0, paddingLeft: 18 },
  listItem: { fontSize: 13.5, color: TEXT, marginBottom: 4, lineHeight: 1.5 },
  mealCard: {
    background: SURFACE,
    border: `1px solid ${LINE}`,
    borderRadius: 10,
    padding: "10px 14px",
    display: "flex",
    flexDirection: "column",
    gap: 2,
  },
  mealName: { fontWeight: 700, fontSize: 13.5 },
  mealItems: { color: MUTED, fontSize: 13 },
  chatLog: {
    background: SURFACE,
    border: `1px solid ${LINE}`,
    borderRadius: 10,
    padding: 14,
    flex: 1,
    minHeight: 300,
    maxHeight: 420,
    overflowY: "auto",
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },
  bubbleCoach: {
    background: SURFACE_2,
    borderRadius: 10,
    padding: "8px 12px",
    fontSize: 13.5,
    lineHeight: 1.5,
    alignSelf: "flex-start",
    maxWidth: "85%",
  },
  bubbleUser: {
    background: ACCENT,
    color: "#16210A",
    borderRadius: 10,
    padding: "8px 12px",
    fontSize: 13.5,
    lineHeight: 1.5,
    alignSelf: "flex-end",
    maxWidth: "85%",
    fontWeight: 500,
  },
  chatForm: { display: "flex", gap: 8, marginTop: 12 },
  chatInput: {
    flex: 1,
    background: SURFACE,
    border: `1px solid ${LINE}`,
    borderRadius: 8,
    padding: "10px 12px",
    color: TEXT,
    fontSize: 14,
    outline: "none",
  },
  sendBtn: {
    background: ACCENT,
    color: "#16210A",
    border: "none",
    borderRadius: 8,
    padding: "0 18px",
    fontWeight: 700,
    cursor: "pointer",
  },
};
