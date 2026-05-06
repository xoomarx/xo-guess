"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ref, set, get } from "firebase/database";
import { signInAnonymously } from "firebase/auth";
import { auth, db } from "../lib/firebase";
import type { GameMode } from "../lib/questions";

function createRoomCode() {
  return Math.random().toString(36).substring(2, 7).toUpperCase();
}

const MODES: { value: GameMode; emoji: string; label: string; desc: string }[] = [
  { value: "flags", emoji: "🌍", label: "Flags Only", desc: "150+ countries" },
  { value: "logos", emoji: "🏷️", label: "Logos Only", desc: "100+ brands" },
  { value: "mix",   emoji: "🎲", label: "Mix Both",  desc: "Flags + logos" },
];

export default function Home() {
  const router = useRouter();
  const [tab, setTab]         = useState<"create" | "join">("create");
  const [name, setName]       = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [joinError, setJoinError] = useState("");
  const [gameMode, setGameMode] = useState<GameMode>("mix");

  async function getOrSignIn() {
    if (auth.currentUser) return auth.currentUser;
    const result = await signInAnonymously(auth);
    return result.user;
  }

  async function createRoom() {
    if (!name.trim()) return;
    setLoading(true);
    const user = await getOrSignIn();
    const roomCode = createRoomCode();
    await set(ref(db, `rooms/${roomCode}`), {
      hostId: user.uid,
      status: "lobby",
      gameMode,
      questionIndex: 0,
      players: { [user.uid]: { name: name.trim(), score: 0 } },
    });
    localStorage.setItem("name", name.trim());
    router.push(`/room/${roomCode}`);
  }

  async function joinRoom() {
    if (!name.trim() || !joinCode.trim()) return;
    setLoading(true);
    setJoinError("");
    const code = joinCode.trim().toUpperCase();
    const snapshot = await get(ref(db, `rooms/${code}`));
    if (!snapshot.exists()) {
      setJoinError("Room not found. Check the code and try again.");
      setLoading(false);
      return;
    }
    const user = await getOrSignIn();
    localStorage.setItem("name", name.trim());
    router.push(`/room/${code}`);
  }

  const canSubmit =
    tab === "create"
      ? name.trim() && !loading
      : name.trim() && joinCode.trim() && !loading;

  return (
    <>
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800;900&family=DM+Sans:ital,wght@0,300;0,400;0,500;1,300&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        :root {
          --bg: #05080f;
          --surface: #0b1120;
          --surface2: #101828;
          --border: rgba(255,255,255,0.07);
          --border-accent: rgba(240,192,64,0.3);
          --accent: #f0c040;
          --accent2: #4af0a0;
          --danger: #f06060;
          --text: #e8edf5;
          --muted: #4a5a72;
        }

        body {
          background: var(--bg);
          color: var(--text);
          font-family: 'DM Sans', sans-serif;
          min-height: 100vh;
          overflow-x: hidden;
        }

        @keyframes grain {
          0%,100%{transform:translate(0,0)}10%{transform:translate(-2%,-3%)}
          20%{transform:translate(3%,2%)}30%{transform:translate(-1%,4%)}
          40%{transform:translate(4%,-1%)}50%{transform:translate(-3%,3%)}
          60%{transform:translate(2%,-4%)}70%{transform:translate(-4%,1%)}
          80%{transform:translate(3%,-2%)}90%{transform:translate(-2%,4%)}
        }
        @keyframes float { 0%,100%{transform:translateY(0)}50%{transform:translateY(-16px)} }
        @keyframes pulse-ring {
          0%{transform:scale(1);opacity:0.7} 100%{transform:scale(1.8);opacity:0}
        }
        @keyframes fadeUp {
          from{opacity:0;transform:translateY(28px)} to{opacity:1;transform:translateY(0)}
        }
        @keyframes shimmer {
          0%{background-position:-200% center} 100%{background-position:200% center}
        }
        @keyframes spin-slow { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes tab-slide {
          from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)}
        }
        @keyframes error-in {
          from{opacity:0;transform:translateY(-6px)} to{opacity:1;transform:translateY(0)}
        }
        @keyframes mode-select {
          0%{transform:scale(1)} 40%{transform:scale(0.94)} 100%{transform:scale(1)}
        }

        .noise::after {
          content:'';position:fixed;inset:-50%;width:200%;height:200%;
          background-image:url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E");
          opacity:0.03;pointer-events:none;z-index:999;animation:grain 8s steps(10) infinite;
        }

        .bg-ring {
          position:fixed;border-radius:50%;pointer-events:none;border:1px solid;
        }
        .bg-ring-1 {
          width:600px;height:600px;top:50%;left:50%;
          transform:translate(-50%,-50%);
          border-color:rgba(240,192,64,0.04);
          animation:spin-slow 40s linear infinite;
        }
        .bg-ring-2 {
          width:900px;height:900px;top:50%;left:50%;
          transform:translate(-50%,-50%);
          border-color:rgba(74,240,160,0.03);
          animation:spin-slow 60s linear infinite reverse;
        }
        .hero-glow {
          position:fixed;top:-300px;left:50%;transform:translateX(-50%);
          width:800px;height:800px;
          background:radial-gradient(ellipse,rgba(240,192,64,0.07) 0%,transparent 65%);
          pointer-events:none;
        }
        .hero-glow-2 {
          position:fixed;bottom:-200px;right:-100px;
          width:600px;height:600px;
          background:radial-gradient(ellipse,rgba(74,240,160,0.05) 0%,transparent 65%);
          pointer-events:none;
        }

        .card {
          width:100%;max-width:480px;
          background:var(--surface);
          border:1px solid var(--border);
          border-radius:28px;
          padding:40px;
          position:relative;
          animation:fadeUp 0.6s cubic-bezier(0.22,1,0.36,1) both;
          box-shadow:0 32px 80px rgba(0,0,0,0.5),0 0 0 1px rgba(255,255,255,0.04) inset;
        }

        .badge {
          display:inline-flex;align-items:center;gap:7px;
          background:rgba(240,192,64,0.08);border:1px solid rgba(240,192,64,0.2);
          color:var(--accent);font-size:10px;font-weight:600;
          letter-spacing:0.15em;text-transform:uppercase;
          padding:6px 14px;border-radius:100px;margin-bottom:28px;
          animation:fadeUp 0.4s ease both;
        }
        .badge-dot {
          width:6px;height:6px;border-radius:50%;background:var(--accent);position:relative;
        }
        .badge-dot::after {
          content:'';position:absolute;inset:-3px;border-radius:50%;
          background:var(--accent);animation:pulse-ring 1.5s ease-out infinite;
        }

        h1.title {
          font-family:'Syne',sans-serif;
          font-size:clamp(52px,9vw,96px);
          font-weight:900;line-height:0.92;
          letter-spacing:-0.04em;margin-bottom:20px;
          animation:fadeUp 0.5s ease both;animation-delay:0.05s;
        }
        .title-accent {
          background:linear-gradient(90deg,var(--accent),var(--accent2),var(--accent));
          background-size:200% auto;
          -webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;
          animation:shimmer 3s linear infinite,fadeUp 0.5s ease both;
          animation-delay:0s,0.08s;
        }

        .subtitle {
          font-size:14px;color:var(--muted);line-height:1.75;
          max-width:320px;margin-bottom:28px;font-weight:300;
          animation:fadeUp 0.5s ease both;animation-delay:0.12s;
        }

        /* ── Mode Selector ── */
        .mode-section {
          margin-bottom:20px;
          animation:fadeUp 0.5s ease both;animation-delay:0.14s;
        }
        .mode-label {
          font-size:10px;font-weight:700;text-transform:uppercase;
          letter-spacing:0.14em;color:var(--muted);margin-bottom:10px;display:block;
        }
        .mode-grid {
          display:grid;grid-template-columns:repeat(3,1fr);gap:8px;
        }
        .mode-btn {
          display:flex;flex-direction:column;align-items:center;gap:5px;
          padding:12px 8px;border-radius:14px;border:1px solid var(--border);
          background:var(--surface2);cursor:pointer;
          transition:all 0.18s cubic-bezier(0.22,1,0.36,1);
          color:var(--muted);
        }
        .mode-btn:hover {
          border-color:rgba(255,255,255,0.14);color:var(--text);
          transform:translateY(-1px);
        }
        .mode-btn.selected {
          border-color:var(--border-accent);
          background:rgba(240,192,64,0.07);
          color:var(--text);
          box-shadow:0 0 0 1px rgba(240,192,64,0.15), 0 8px 24px rgba(240,192,64,0.1);
          animation:mode-select 0.25s ease;
        }
        .mode-btn.selected.flags-mode {
          border-color:rgba(74,240,160,0.35);
          background:rgba(74,240,160,0.07);
          box-shadow:0 0 0 1px rgba(74,240,160,0.15), 0 8px 24px rgba(74,240,160,0.1);
        }
        .mode-btn.selected.logos-mode {
          border-color:rgba(160,120,255,0.35);
          background:rgba(160,120,255,0.07);
          box-shadow:0 0 0 1px rgba(160,120,255,0.15), 0 8px 24px rgba(160,120,255,0.1);
        }
        .mode-emoji { font-size:22px;line-height:1; }
        .mode-name {
          font-family:'Syne',sans-serif;font-size:11px;font-weight:800;
          letter-spacing:0.02em;
        }
        .mode-desc { font-size:10px;color:var(--muted);text-align:center; }
        .mode-btn.selected .mode-desc { color:inherit;opacity:0.7; }

        /* Tabs */
        .tabs {
          display:grid;grid-template-columns:1fr 1fr;
          background:var(--surface2);border-radius:14px;padding:4px;
          gap:4px;margin-bottom:24px;
          animation:fadeUp 0.5s ease both;animation-delay:0.16s;
          border:1px solid var(--border);
        }
        .tab {
          padding:10px;border-radius:11px;border:none;
          font-family:'DM Sans',sans-serif;font-size:13px;font-weight:500;
          cursor:pointer;transition:all 0.2s;color:var(--muted);background:transparent;
        }
        .tab.active {
          background:var(--surface);color:var(--text);
          box-shadow:0 2px 12px rgba(0,0,0,0.3);
          border:1px solid var(--border);
        }
        .tab:hover:not(.active) { color:var(--text); }

        .form { animation:tab-slide 0.25s ease both; }

        .input-group { margin-bottom:12px; }
        .input-label {
          display:block;font-size:11px;font-weight:500;
          text-transform:uppercase;letter-spacing:0.1em;
          color:var(--muted);margin-bottom:7px;
        }

        .field {
          width:100%;background:var(--surface2);
          border:1px solid var(--border);color:var(--text);
          font-family:'DM Sans',sans-serif;font-size:15px;
          padding:14px 18px;border-radius:14px;outline:none;
          transition:border-color 0.2s,box-shadow 0.2s;
        }
        .field:focus {
          border-color:var(--border-accent);
          box-shadow:0 0 0 3px rgba(240,192,64,0.07);
        }
        .field::placeholder { color:var(--muted); }

        .code-field {
          text-transform:uppercase;letter-spacing:0.2em;
          font-family:'Syne',sans-serif;font-size:18px;font-weight:700;
          text-align:center;
        }

        .error-msg {
          background:rgba(240,96,96,0.1);border:1px solid rgba(240,96,96,0.25);
          color:var(--danger);font-size:13px;padding:10px 14px;border-radius:10px;
          margin-bottom:12px;animation:error-in 0.2s ease;
        }

        .cta-btn {
          width:100%;margin-top:4px;padding:16px 24px;
          border-radius:14px;border:none;
          background:var(--accent);color:#05080f;
          font-family:'Syne',sans-serif;font-size:15px;font-weight:800;
          letter-spacing:0.02em;cursor:pointer;
          transition:transform 0.15s,box-shadow 0.15s,opacity 0.15s;
          box-shadow:0 4px 32px rgba(240,192,64,0.3);
        }
        .cta-btn:hover:not(:disabled) {
          transform:translateY(-2px);box-shadow:0 8px 48px rgba(240,192,64,0.4);
        }
        .cta-btn:active:not(:disabled) { transform:translateY(0); }
        .cta-btn:disabled { opacity:0.4;cursor:not-allowed; }
        .cta-btn.join-btn {
          background:var(--accent2);box-shadow:0 4px 32px rgba(74,240,160,0.25);
        }
        .cta-btn.join-btn:hover:not(:disabled) { box-shadow:0 8px 48px rgba(74,240,160,0.38); }

        .features {
          display:flex;gap:10px;margin-top:32px;
          animation:fadeUp 0.5s ease both;animation-delay:0.28s;
        }
        .feature {
          flex:1;background:var(--surface2);border:1px solid var(--border);
          border-radius:16px;padding:14px 12px;text-align:center;
        }
        .feature-icon { font-size:20px;margin-bottom:6px;display:block; }
        .feature-title { font-family:'Syne',sans-serif;font-size:12px;font-weight:700;margin-bottom:3px; }
        .feature-desc { font-size:11px;color:var(--muted);line-height:1.4; }

        .orb { position:absolute;border-radius:50%;pointer-events:none; }
        .orb-1 {
          width:280px;height:280px;
          background:radial-gradient(circle,rgba(74,240,160,0.07),transparent 70%);
          bottom:-60px;right:-70px;animation:float 7s ease-in-out infinite;
        }
        .orb-2 {
          width:180px;height:180px;
          background:radial-gradient(circle,rgba(240,192,64,0.08),transparent 70%);
          top:40px;left:-50px;animation:float 9s ease-in-out infinite reverse;
        }
      `}</style>

      <div className="noise" />
      <div className="bg-ring bg-ring-1" />
      <div className="bg-ring bg-ring-2" />
      <div className="hero-glow" />
      <div className="hero-glow-2" />

      <main style={{
        minHeight:'100vh',display:'flex',alignItems:'center',
        justifyContent:'center',padding:'40px 20px',position:'relative',
      }}>
        <div className="card">
          <div className="orb orb-1" />
          <div className="orb orb-2" />

          <div className="badge">
            <span className="badge-dot" />
            Multiplayer · Live
          </div>

          <h1 className="title">
            Logo<br />
            <span className="title-accent">& Flag</span><br />
            Rush
          </h1>

          <p className="subtitle">
            Guess logos and flags faster than anyone. Speed wins points.
          </p>

          {/* ── Game Mode Selector (only for Create) ── */}
          {tab === "create" && (
            <div className="mode-section">
              <span className="mode-label">Game Mode</span>
              <div className="mode-grid">
                {MODES.map((m) => (
                  <button
                    key={m.value}
                    className={`mode-btn ${gameMode === m.value ? `selected ${m.value}-mode` : ""}`}
                    onClick={() => setGameMode(m.value)}
                  >
                    <span className="mode-emoji">{m.emoji}</span>
                    <span className="mode-name">{m.label}</span>
                    <span className="mode-desc">{m.desc}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Tabs */}
          <div className="tabs">
            <button
              className={`tab ${tab === "create" ? "active" : ""}`}
              onClick={() => { setTab("create"); setJoinError(""); }}
            >
              ✦ Create Game
            </button>
            <button
              className={`tab ${tab === "join" ? "active" : ""}`}
              onClick={() => { setTab("join"); setJoinError(""); }}
            >
              → Join Room
            </button>
          </div>

          {tab === "create" && (
            <div className="form" key="create">
              <div className="input-group">
                <label className="input-label">Your name</label>
                <input
                  className="field"
                  placeholder="Enter your name…"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !loading && name.trim() && createRoom()}
                  maxLength={20}
                />
              </div>
              <button className="cta-btn" onClick={createRoom} disabled={!name.trim() || loading}>
                {loading ? "Creating room…" : "Create Game →"}
              </button>
            </div>
          )}

          {tab === "join" && (
            <div className="form" key="join">
              <div className="input-group">
                <label className="input-label">Your name</label>
                <input
                  className="field"
                  placeholder="Enter your name…"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={20}
                />
              </div>
              <div className="input-group">
                <label className="input-label">Room code</label>
                <input
                  className="field code-field"
                  placeholder="XXXXX"
                  value={joinCode}
                  onChange={(e) => { setJoinCode(e.target.value.toUpperCase()); setJoinError(""); }}
                  onKeyDown={(e) => e.key === "Enter" && !loading && canSubmit && joinRoom()}
                  maxLength={5}
                />
              </div>
              {joinError && <div className="error-msg">⚠ {joinError}</div>}
              <button className="cta-btn join-btn" onClick={joinRoom} disabled={!canSubmit}>
                {loading ? "Joining…" : "Join Room →"}
              </button>
            </div>
          )}

          <div className="features">
            <div className="feature">
              <span className="feature-icon">🌍</span>
              <div className="feature-title">Flags</div>
              <div className="feature-desc">150+ countries</div>
            </div>
            <div className="feature">
              <span className="feature-icon">🏷️</span>
              <div className="feature-title">Logos</div>
              <div className="feature-desc">100+ brands</div>
            </div>
            <div className="feature">
              <span className="feature-icon">⚡</span>
              <div className="feature-title">Speed</div>
              <div className="feature-desc">Fast = more pts</div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
