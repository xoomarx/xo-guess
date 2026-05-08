"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ref, set, get } from "firebase/database";
import { signInAnonymously } from "firebase/auth";
import { auth, db } from "../lib/firebase";
import type { GameMode, Difficulty } from "../lib/questions";

function createRoomCode() {
  return Math.random().toString(36).substring(2, 7).toUpperCase();
}

type PartyGameType = "logo-flag" | "party-mix" | "emoji" | "typing" | "would-you-rather" | "trivia" | "odd-one-out" | "this-or-that";

const MODES: { value: GameMode; emoji: string; label: string; desc: string }[] = [
  { value: "flags", emoji: "🌍", label: "Flags Only", desc: "150+ countries" },
  { value: "logos", emoji: "🏷️", label: "Logos Only", desc: "100+ brands" },
  { value: "mix",   emoji: "🎲", label: "Mix Both",  desc: "Flags + logos" },
];


const PARTY_GAMES: { value: PartyGameType; emoji: string; label: string; desc: string }[] = [
  { value: "logo-flag", emoji: "🏷️", label: "Logo & Flag Rush", desc: "Your classic image guessing game" },
  { value: "party-mix", emoji: "🎉", label: "Party Mix", desc: "Random game type every round" },
  { value: "emoji", emoji: "😂", label: "Emoji Guess", desc: "Guess brands, movies, games from emojis" },
  { value: "typing", emoji: "⌨️", label: "Typing Battle", desc: "Type the phrase fastest" },
  { value: "would-you-rather", emoji: "🤔", label: "Majority Guess", desc: "Predict the popular choice" },
  { value: "trivia", emoji: "🧠", label: "Trivia Rush", desc: "Quick questions, speed scoring" },
  { value: "odd-one-out", emoji: "🧩", label: "Odd One Out", desc: "Find the one that doesn't belong" },
  { value: "this-or-that", emoji: "⚡", label: "Prediction Pick", desc: "Choose the predicted winner" },
];


export default function Home() {
  const router = useRouter();
  const [tab, setTab]         = useState<"create" | "join">("create");
  const [name, setName]       = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [joinError, setJoinError] = useState("");
  const [gameMode, setGameMode] = useState<GameMode>("mix");
  const [gameType, setGameType] = useState<PartyGameType>("logo-flag");
  const [rounds, setRounds] = useState(10);
  const [timerSeconds, setTimerSeconds] = useState(15);
  const [difficulty, setDifficulty] = useState<Difficulty | "all">("all");
  const [customCode, setCustomCode] = useState("");

  async function getOrSignIn() {
    if (auth.currentUser) return auth.currentUser;
    const result = await signInAnonymously(auth);
    return result.user;
  }

  async function createRoom() {
    if (!name.trim()) return;
    setLoading(true);
    setJoinError("");
    const user = await getOrSignIn();
    const requestedCode = customCode.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
    const roomCode = requestedCode || createRoomCode();

    if (requestedCode) {
      const existing = await get(ref(db, `rooms/${roomCode}`));
      if (existing.exists()) {
        setJoinError("That custom room code is already taken.");
        setLoading(false);
        return;
      }
    }
    await set(ref(db, `rooms/${roomCode}`), {
      hostId: user.uid,
      status: "lobby",
      gameType,
      gameMode,
      totalRounds: rounds,
      timerSeconds,
      difficulty,
      questionIndex: 0,
      players: { [user.uid]: { name: name.trim(), score: 0 } },
    });
    localStorage.setItem("name", name.trim());
    router.push(`/room/${roomCode}`);
  }


  async function createSoloGame() {
    if (!name.trim()) return;
    setLoading(true);

    const user = await getOrSignIn();
    const roomCode = createRoomCode();

    await set(ref(db, `rooms/${roomCode}`), {
      hostId: user.uid,
      status: "lobby",
      solo: true,
      gameType,
      gameMode,
      totalRounds: rounds,
      timerSeconds,
      difficulty,
      questionIndex: 0,
      roundNumber: 0,
      usedQuestionIndexes: [],
      currentQuestion: null,
      roundStartedAt: null,
      roundAnswers: {},
      phase: "question",
      revealStartedAt: null,
      players: {
        [user.uid]: {
          name: name.trim(),
          score: 0,
          avatar: "🎮",
          color: "#38d9ff",
          streak: 0,
          bestStreak: 0,
          typing: false,
        },
      },
    });

    localStorage.setItem("name", name.trim());
    router.push(`/room/${roomCode}`);
  }

  async function createDailyChallenge() {
    setGameMode("mix");
    setRounds(10);
    setTimerSeconds(15);
    setDifficulty("all");
    await createSoloGame();
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
          --bg: #050716;
          --bg2: #0b1230;
          --surface: rgba(13, 22, 44, 0.82);
          --surface2: rgba(26, 39, 72, 0.78);
          --surface3: rgba(35, 52, 94, 0.9);
          --border: rgba(255,255,255,0.10);
          --border-accent: rgba(56, 217, 255, 0.35);
          --accent: #38d9ff;
          --accent2: #a78bfa;
          --accent3: #facc15;
          --danger: #fb7185;
          --text: #f8fbff;
          --muted: #9aaccf;
          --glow: 0 0 34px rgba(56, 217, 255, 0.16);
        }

        body {
          background:
            radial-gradient(circle at 18% 12%, rgba(56,217,255,0.14), transparent 30%),
            radial-gradient(circle at 88% 18%, rgba(167,139,250,0.16), transparent 32%),
            radial-gradient(circle at 50% 100%, rgba(250,204,21,0.09), transparent 28%),
            linear-gradient(180deg, var(--bg), var(--bg2));
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
          width:100%;max-width:520px;
          background:linear-gradient(180deg, rgba(18,29,58,0.88), rgba(10,17,37,0.88));
          border:1px solid var(--border);
          border-radius:32px;
          padding:42px;
          position:relative;
          animation:fadeUp 0.6s cubic-bezier(0.22,1,0.36,1) both;
          box-shadow:0 34px 90px rgba(0,0,0,0.52), var(--glow), 0 0 0 1px rgba(255,255,255,0.04) inset;
          backdrop-filter:blur(18px);
          overflow:hidden;
        }

        .badge {
          display:inline-flex;align-items:center;gap:8px;
          background:rgba(56,217,255,0.10);border:1px solid rgba(56,217,255,0.24);
          color:var(--accent);font-size:10px;font-weight:800;
          letter-spacing:0.16em;text-transform:uppercase;
          padding:7px 15px;border-radius:100px;margin-bottom:28px;
          animation:fadeUp 0.4s ease both;
          box-shadow:0 0 22px rgba(56,217,255,0.12);
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
          background:linear-gradient(90deg,var(--accent),var(--accent2),var(--accent3),var(--accent));
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
          display:flex;flex-direction:column;align-items:center;gap:6px;
          padding:14px 8px;border-radius:18px;border:1px solid var(--border);
          background:linear-gradient(180deg, rgba(255,255,255,0.045), rgba(255,255,255,0.018));
          cursor:pointer;
          transition:transform 0.18s cubic-bezier(0.22,1,0.36,1), border-color 0.18s, box-shadow 0.18s, background 0.18s;
          color:var(--muted);
        }
        .mode-btn:hover {
          border-color:rgba(255,255,255,0.14);color:var(--text);
          transform:translateY(-1px);
        }
        .mode-btn.selected {
          border-color:rgba(56,217,255,0.42);
          background:linear-gradient(180deg, rgba(56,217,255,0.12), rgba(167,139,250,0.10));
          color:var(--text);
          box-shadow:0 0 0 1px rgba(56,217,255,0.16), 0 16px 34px rgba(56,217,255,0.13);
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



        .game-picker-grid{
          display:grid;
          grid-template-columns:repeat(2,minmax(0,1fr));
          gap:10px;
        }
        .game-card{
          display:flex;
          flex-direction:column;
          gap:5px;
          text-align:left;
          border:1px solid var(--border);
          background:rgba(255,255,255,0.045);
          border-radius:16px;
          padding:12px;
          color:var(--text);
          cursor:pointer;
          transition:transform .18s ease,border-color .18s ease,background .18s ease;
        }
        .game-card:hover{transform:translateY(-2px);border-color:rgba(56,217,255,.45)}
        .game-card.selected{
          border-color:rgba(56,217,255,.9);
          background:rgba(56,217,255,.09);
          box-shadow:0 0 0 2px rgba(56,217,255,.15);
        }
        .game-emoji{font-size:24px}
        .game-name{font-weight:900;font-size:13px}
        .game-desc{font-size:11px;color:var(--muted);line-height:1.25}

        .settings-grid{
          display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:10px;
        }
        .setting-card{
          display:flex;flex-direction:column;gap:6px;
          background:rgba(255,255,255,0.04);
          border:1px solid var(--border);
          border-radius:14px;padding:10px;
        }
        .setting-card span,.custom-code-wrap span{
          font-size:10px;font-weight:800;letter-spacing:0.10em;text-transform:uppercase;color:var(--muted);
        }
        .setting-card select{
          background:transparent;border:none;color:var(--text);font-weight:800;outline:none;
        }
        .setting-card option{background:#101828;color:white}
        .custom-code-wrap{
          display:flex;flex-direction:column;gap:7px;margin-top:10px;
        }

        /* Tabs */
        .tabs {
          display:grid;grid-template-columns:1fr 1fr;
          background:rgba(5,8,18,0.55);border-radius:18px;padding:5px;
          gap:5px;margin-bottom:24px;
          animation:fadeUp 0.5s ease both;animation-delay:0.16s;
          border:1px solid var(--border);
        }
        .tab {
          padding:10px;border-radius:11px;border:none;
          font-family:'DM Sans',sans-serif;font-size:13px;font-weight:500;
          cursor:pointer;transition:all 0.2s;color:var(--muted);background:transparent;
        }
        .tab.active {
          background:linear-gradient(135deg, rgba(56,217,255,0.16), rgba(167,139,250,0.14));
          color:var(--text);
          box-shadow:0 10px 22px rgba(0,0,0,0.22), 0 0 18px rgba(56,217,255,0.10);
          border:1px solid rgba(255,255,255,0.12);
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
          width:100%;background:rgba(255,255,255,0.055);
          border:1px solid var(--border);color:var(--text);
          font-family:'DM Sans',sans-serif;font-size:15px;
          padding:15px 18px;border-radius:17px;outline:none;
          transition:border-color 0.2s,box-shadow 0.2s,background 0.2s;
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
          width:100%;margin-top:4px;padding:17px 24px;
          border-radius:18px;border:none;
          background:linear-gradient(135deg,var(--accent),#8be9ff);
          color:#04111b;
          font-family:'Syne',sans-serif;font-size:15px;font-weight:900;
          letter-spacing:0.02em;cursor:pointer;
          transition:transform 0.15s,box-shadow 0.15s,opacity 0.15s;
          box-shadow:0 12px 34px rgba(56,217,255,0.26);
        }
        .cta-btn:hover:not(:disabled) {
          transform:translateY(-2px);box-shadow:0 8px 48px rgba(240,192,64,0.4);
        }
        .cta-btn:active:not(:disabled) { transform:translateY(0); }
        .cta-btn:disabled { opacity:0.4;cursor:not-allowed; }
        .cta-btn.join-btn {
          background:linear-gradient(135deg,var(--accent2),#c4b5fd);box-shadow:0 12px 34px rgba(167,139,250,0.24);
        }
        .cta-btn.join-btn:hover:not(:disabled) { box-shadow:0 8px 48px rgba(74,240,160,0.38); }

        .features {
          display:flex;gap:10px;margin-top:32px;
          animation:fadeUp 0.5s ease both;animation-delay:0.28s;
        }
        .feature {
          flex:1;background:rgba(255,255,255,0.04);border:1px solid var(--border);
          border-radius:18px;padding:15px 13px;text-align:center;
          box-shadow:0 10px 24px rgba(0,0,0,0.16);
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
            Rush<br />
            <span className="title-accent">Party</span><br />
            Games
          </h1>

          <p className="subtitle">
            Pick a game, invite friends, and race for the leaderboard.
          </p>

          {/* ── Game Mode Selector (only for Create) ── */}
          {tab === "create" && (
            <div className="mode-section">
              <span className="mode-label">Choose Game</span>
              <div className="game-picker-grid">
                {PARTY_GAMES.map((game) => (
                  <button
                    key={game.value}
                    type="button"
                    className={`game-card ${gameType === game.value ? "selected" : ""}`}
                    onClick={() => setGameType(game.value)}
                  >
                    <span className="game-emoji">{game.emoji}</span>
                    <span className="game-name">{game.label}</span>
                    <span className="game-desc">{game.desc}</span>
                  </button>
                ))}
              </div>

              <div className={`logo-mode-wrap ${gameType !== "logo-flag" ? "hidden" : ""}`}>
                <span className="mode-label">Logo/Flag Mode</span>
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

              <div className="settings-grid">
                <label className="setting-card">
                  <span>Rounds</span>
                  <select value={rounds} onChange={(e) => setRounds(Number(e.target.value))}>
                    <option value={5}>5</option>
                    <option value={10}>10</option>
                    <option value={15}>15</option>
                    <option value={20}>20</option>
                  </select>
                </label>

                <label className="setting-card">
                  <span>Timer</span>
                  <select value={timerSeconds} onChange={(e) => setTimerSeconds(Number(e.target.value))}>
                    <option value={10}>10s</option>
                    <option value={15}>15s</option>
                    <option value={20}>20s</option>
                  </select>
                </label>

                <label className="setting-card">
                  <span>Difficulty</span>
                  <select value={difficulty} onChange={(e) => setDifficulty(e.target.value as Difficulty | "all")}>
                    <option value="all">All</option>
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </label>
              </div>

              <label className="custom-code-wrap">
                <span>Custom room code</span>
                <input
                  className="field code-field"
                  placeholder="OPTIONAL"
                  value={customCode}
                  onChange={(e) => setCustomCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8))}
                  maxLength={8}
                />
              </label>
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
              {joinError && <div className="error-msg">⚠ {joinError}</div>}
              <button className="cta-btn" onClick={createRoom} disabled={!name.trim() || loading}>
                {loading ? "Creating room…" : "Create Game →"}
              </button>

              <div className="quick-actions">
                <button className="tab" onClick={createSoloGame} disabled={!name.trim() || loading}>
                  🎯 Solo Practice
                </button>
                <button className="tab" onClick={createDailyChallenge} disabled={!name.trim() || loading}>
                  📅 Daily Challenge
                </button>
              </div>
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
            <div className="feature">
              <span className="feature-icon">🏆</span>
              <div className="feature-title">Daily</div>
              <div className="feature-desc">Challenge ready</div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
