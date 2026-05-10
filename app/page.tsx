"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ref, set, get } from "firebase/database";
import { signInAnonymously, signInWithPopup } from "firebase/auth";
import { auth, db, googleProvider } from "../lib/firebase";
import type { GameMode, Difficulty } from "../lib/questions";

function createRoomCode() {
  return Math.random().toString(36).substring(2, 7).toUpperCase();
}

type PartyGameType = "logo-flag" | "party-mix" | "emoji" | "typing" | "would-you-rather" | "trivia" | "odd-one-out" | "this-or-that" | "math-rush" | "true-or-false" | "fill-blank";

const MODES: { value: GameMode; emoji: string; label: string; desc: string }[] = [
  { value: "flags", emoji: "🌍", label: "Flags", desc: "150+ countries" },
  { value: "logos", emoji: "🏷️", label: "Logos", desc: "100+ brands" },
  { value: "mix",   emoji: "🎲", label: "Mix",   desc: "Both" },
];

const PARTY_GAMES: { value: PartyGameType; emoji: string; label: string; desc: string; color: string; bg: string }[] = [
  { value: "logo-flag",       emoji: "🏷️", label: "Logo & Flag",    desc: "Image guessing",      color: "#38d9ff", bg: "rgba(56,217,255,0.13)" },
  { value: "party-mix",       emoji: "🎉", label: "Party Mix",       desc: "Random every round",  color: "#a78bfa", bg: "rgba(167,139,250,0.13)" },
  { value: "emoji",           emoji: "😂", label: "Emoji Guess",     desc: "Guess from emojis",   color: "#facc15", bg: "rgba(250,204,21,0.11)" },
  { value: "typing",          emoji: "⌨️", label: "Typing Battle",   desc: "Type the fastest",    color: "#4af0a0", bg: "rgba(74,240,160,0.11)" },
  { value: "would-you-rather",emoji: "🤔", label: "Majority Guess",  desc: "Predict the crowd",   color: "#f472b6", bg: "rgba(244,114,182,0.11)" },
  { value: "trivia",          emoji: "🧠", label: "Trivia Rush",     desc: "Quick-fire trivia",   color: "#60a5fa", bg: "rgba(96,165,250,0.11)" },
  { value: "odd-one-out",     emoji: "🧩", label: "Odd One Out",     desc: "Spot the oddball",    color: "#fb923c", bg: "rgba(251,146,60,0.11)" },
  { value: "this-or-that",    emoji: "⚡", label: "Prediction Pick", desc: "Pick the winner",     color: "#34d399", bg: "rgba(52,211,153,0.11)" },
  { value: "math-rush",      emoji: "🔢", label: "Math Rush",       desc: "Solve it fast",       color: "#f59e0b", bg: "rgba(245,158,11,0.11)" },
  { value: "true-or-false",  emoji: "✅", label: "True or False",   desc: "Trust your gut",      color: "#10b981", bg: "rgba(16,185,129,0.11)" },
  { value: "fill-blank",     emoji: "📝", label: "Fill the Blank",  desc: "Complete the phrase", color: "#8b5cf6", bg: "rgba(139,92,246,0.11)" },
];

export default function Home() {
  const router = useRouter();
  const [tab, setTab]               = useState<"create" | "join">("create");
  const [name, setName]             = useState("");
  const [joinCode, setJoinCode]     = useState("");
  const [loading, setLoading]       = useState(false);
  const [joinError, setJoinError]   = useState("");
  const [gameMode, setGameMode]     = useState<GameMode>("mix");
  const [gameType, setGameType]     = useState<PartyGameType>("logo-flag");
  const [rounds, setRounds]         = useState(10);
  const [timerSeconds, setTimerSeconds] = useState(15);
  const [difficulty, setDifficulty] = useState<Difficulty | "all">("all");
  const [customCode, setCustomCode] = useState("");
  const [roomPassword, setRoomPassword] = useState("");
  const [joinPassword, setJoinPassword] = useState("");
  const [recentRooms, setRecentRooms] = useState<{ code: string; game: string }[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem("recentRooms");
    if (stored) setRecentRooms(JSON.parse(stored));
    const savedName = localStorage.getItem("name");
    if (savedName) setName(savedName);
  }, []);

  async function getOrSignIn() {
    if (auth.currentUser) return auth.currentUser;
    const result = await signInAnonymously(auth);
    return result.user;
  }

  async function signInWithGoogle() {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      if (result.user.displayName) setName(result.user.displayName.split(" ")[0]);
      return result.user;
    } catch {
      const result = await signInAnonymously(auth);
      return result.user;
    }
  }

  function saveRecentRoom(code: string, game: string) {
    const existing: { code: string; game: string }[] = JSON.parse(localStorage.getItem("recentRooms") || "[]");
    const updated = [{ code, game }, ...existing.filter((r) => r.code !== code)].slice(0, 5);
    localStorage.setItem("recentRooms", JSON.stringify(updated));
    setRecentRooms(updated);
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
      password: roomPassword.trim() || null,
      players: { [user.uid]: { name: name.trim(), score: 0 } },
    });
    localStorage.setItem("name", name.trim());
    saveRecentRoom(roomCode, gameType);
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
    const roomData = snapshot.val();
    if (roomData.password) {
      if (!joinPassword.trim() || joinPassword.trim() !== roomData.password) {
        setJoinError("Wrong password. Ask the host for the room password.");
        setLoading(false);
        return;
      }
    }
    await getOrSignIn();
    localStorage.setItem("name", name.trim());
    saveRecentRoom(code, roomData.gameType || "logo-flag");
    router.push(`/room/${code}`);
  }

  const selectedGame = PARTY_GAMES.find(g => g.value === gameType);

  return (
    <>
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800;900&family=DM+Sans:wght@300;400;500;700&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        :root {
          --bg: #03050f;
          --surface: rgba(10,14,32,0.92);
          --surface2: rgba(16,22,50,0.88);
          --border: rgba(255,255,255,0.08);
          --border-hi: rgba(255,255,255,0.16);
          --accent: #38d9ff;
          --accent2: #a78bfa;
          --accent3: #facc15;
          --text: #eef2ff;
          --muted: #6b7fa8;
          --danger: #fb7185;
        }

        body {
          background: var(--bg);
          color: var(--text);
          font-family: 'DM Sans', sans-serif;
          min-height: 100vh;
          overflow-x: hidden;
        }

        @keyframes fadeUp   { from{opacity:0;transform:translateY(22px)} to{opacity:1;transform:translateY(0)} }
        @keyframes shimmer  { 0%{background-position:-200% center} 100%{background-position:200% center} }
        @keyframes pulse-dot{ 0%,100%{opacity:1;box-shadow:0 0 6px var(--accent)} 50%{opacity:0.55;box-shadow:0 0 14px var(--accent)} }
        @keyframes card-in { from{opacity:0;transform:translateY(30px) scale(0.97)} to{opacity:1;transform:translateY(0) scale(1)} }
        @keyframes spin-slow{ from{transform:rotate(0deg)} to{transform:rotate(360deg)} }

        /* ── Background ── */
        .aurora-bg {
          position: fixed; inset: 0; z-index: 0; overflow: hidden; pointer-events: none;
          background: #03050f;
        }
        /* dot grid */
        .aurora-bg::before {
          content: ''; position: absolute; inset: 0; pointer-events: none;
          background: radial-gradient(circle, rgba(255,255,255,0.022) 1px, transparent 1px);
          background-size: 44px 44px;
        }
        /* scanlines */
        .aurora-bg::after {
          content: ''; position: absolute; inset: 0; pointer-events: none;
          background: repeating-linear-gradient(to bottom, transparent 0px, transparent 3px, rgba(0,0,0,0.018) 3px, rgba(0,0,0,0.018) 4px);
          animation: scanMove 8s linear infinite;
        }
        @keyframes scanMove { from{background-position:0 0} to{background-position:0 100px} }

        /* blobs — no blur filter, only transform animated = zero jank */
        .blob {
          position: absolute; border-radius: 50%; pointer-events: none;
          will-change: transform;
        }
        .blob-1 {
          width: 75vw; height: 75vw; max-width: 860px; max-height: 860px;
          top: -28%; left: -18%;
          background: radial-gradient(circle at 38% 38%, rgba(99,102,241,0.28) 0%, rgba(56,217,255,0.07) 42%, transparent 65%);
          animation: blobA 22s ease-in-out infinite;
        }
        .blob-2 {
          width: 58vw; height: 58vw; max-width: 680px; max-height: 680px;
          bottom: -18%; right: -14%;
          background: radial-gradient(circle at 60% 60%, rgba(167,139,250,0.25) 0%, rgba(244,114,182,0.06) 42%, transparent 65%);
          animation: blobB 27s ease-in-out infinite;
        }
        .blob-3 {
          width: 40vw; height: 40vw; max-width: 480px; max-height: 480px;
          top: 38%; right: 8%;
          background: radial-gradient(circle at 50% 50%, rgba(250,204,21,0.12) 0%, transparent 65%);
          animation: blobA 19s ease-in-out infinite reverse; animation-delay: -6s;
        }
        .blob-4 {
          width: 48vw; height: 48vw; max-width: 580px; max-height: 580px;
          top: 55%; left: 18%;
          background: radial-gradient(circle at 50% 50%, rgba(56,217,255,0.10) 0%, transparent 65%);
          animation: blobB 24s ease-in-out infinite; animation-delay: -4s;
        }
        @keyframes blobA {
          0%,100% { transform: translate(0,0) scale(1); }
          25%  { transform: translate(3vw,-3vw) scale(1.04); }
          50%  { transform: translate(5vw,2vw) scale(0.97); }
          75%  { transform: translate(-2vw,4vw) scale(1.02); }
        }
        @keyframes blobB {
          0%,100% { transform: translate(0,0) scale(1); }
          25%  { transform: translate(-4vw,2vw) scale(1.03); }
          50%  { transform: translate(-2vw,-4vw) scale(0.98); }
          75%  { transform: translate(3vw,-2vw) scale(1.04); }
        }

        /* ── Page root ── */
        .page-root {
          min-height: 100vh;
          display: flex; align-items: center; justify-content: center;
          padding: 36px 20px;
          position: relative; z-index: 1;
        }
        .page-inner {
          display: grid;
          grid-template-columns: 1fr 500px;
          gap: 64px;
          max-width: 1020px;
          width: 100%;
          align-items: center;
        }
        @media(max-width:900px) {
          .page-inner { grid-template-columns: 1fr; gap: 36px; }
          .hero-col { text-align: center; }
          .hero-features { justify-content: center; }
          .page-root { padding: 28px 16px 40px; }
        }

        /* ── Hero column ── */
        .hero-live {
          display: inline-flex; align-items: center; gap: 8px;
          margin-bottom: 22px;
          animation: fadeUp 0.4s ease both;
        }
        .live-dot {
          width: 7px; height: 7px; border-radius: 50%; background: var(--accent);
          animation: pulse-dot 1.6s ease-in-out infinite;
        }
        .live-text {
          font-size: 10px; font-weight: 800; letter-spacing: 0.2em;
          text-transform: uppercase; color: var(--muted);
        }

        h1.hero-title {
          font-family: 'Syne', sans-serif;
          font-size: clamp(58px, 8.5vw, 92px);
          font-weight: 900; line-height: 0.88;
          letter-spacing: -0.035em;
          margin-bottom: 22px;
          animation: fadeUp 0.5s ease both; animation-delay: 0.06s;
        }
        .title-line { display: block; }
        .title-grad {
          background: linear-gradient(130deg, var(--accent) 0%, var(--accent2) 45%, var(--accent3) 100%);
          background-size: 200% auto;
          -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
          animation: shimmer 4s linear infinite, fadeUp 0.5s ease both;
          animation-delay: 0s, 0.06s;
        }

        .hero-desc {
          font-size: 15px; color: var(--muted); line-height: 1.8;
          max-width: 370px; margin-bottom: 28px;
          animation: fadeUp 0.5s ease both; animation-delay: 0.12s;
        }
        @media(max-width:900px) { .hero-desc { max-width: 100%; } }

        .hero-features {
          display: flex; flex-wrap: wrap; gap: 8px;
          animation: fadeUp 0.5s ease both; animation-delay: 0.18s;
        }
        .hero-pill {
          display: inline-flex; align-items: center; gap: 5px;
          padding: 7px 13px; border-radius: 100px;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.09);
          font-size: 12px; font-weight: 500; color: var(--muted);
          backdrop-filter: blur(8px);
        }

        /* ── Main card ── */
        .main-card {
          background: linear-gradient(155deg, rgba(14,19,48,0.94), rgba(6,9,25,0.94));
          border: 1px solid rgba(255,255,255,0.10);
          border-radius: 28px;
          padding: 30px;
          backdrop-filter: blur(22px);
          box-shadow:
            0 48px 110px rgba(0,0,0,0.65),
            0 0 0 1px rgba(255,255,255,0.04) inset;
          animation: card-in 0.65s cubic-bezier(0.22,1,0.36,1) both;
          animation-delay: 0.08s;
          position: relative; overflow: hidden;
        }
        .main-card::before {
          content: ''; position: absolute; inset: 0; border-radius: 28px; pointer-events: none;
          background:
            radial-gradient(circle at 85% 5%, rgba(167,139,250,0.09), transparent 40%),
            radial-gradient(circle at 5% 95%, rgba(56,217,255,0.07), transparent 40%);
        }

        /* ── Section label ── */
        .sec-label {
          font-size: 10px; font-weight: 800; letter-spacing: 0.18em;
          text-transform: uppercase; color: var(--muted);
          margin-bottom: 10px; display: block;
        }

        /* ── Game picker ── */
        .game-grid {
          display: grid; grid-template-columns: repeat(2,1fr); gap: 7px;
          margin-bottom: 18px;
        }
        .game-btn {
          display: flex; align-items: center; gap: 10px;
          padding: 11px 13px; border-radius: 13px;
          border: 1px solid var(--border);
          background: rgba(255,255,255,0.04);
          cursor: pointer; text-align: left; color: var(--text);
          transition: all 0.17s cubic-bezier(0.22,1,0.36,1);
        }
        .game-btn:hover { background: rgba(255,255,255,0.07); border-color: var(--border-hi); transform: translateY(-1px); }
        .game-btn.active {
          border-color: var(--gc, var(--accent));
          background: var(--gb, rgba(56,217,255,0.11));
          box-shadow: 0 0 0 1px var(--gc, var(--accent)) inset, 0 8px 22px rgba(0,0,0,0.28);
        }
        .game-em { font-size: 19px; flex-shrink: 0; line-height: 1; }
        .game-info { min-width: 0; }
        .game-name { font-size: 12px; font-weight: 800; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .game-desc { font-size: 10px; color: var(--muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .game-btn.active .game-desc { color: inherit; opacity: 0.72; }

        /* ── Mode pills ── */
        .mode-row { display: grid; grid-template-columns: repeat(3,1fr); gap: 6px; margin-bottom: 16px; }
        .mode-pill {
          display: flex; flex-direction: column; align-items: center; gap: 4px;
          padding: 10px 6px; border-radius: 12px;
          border: 1px solid var(--border); background: rgba(255,255,255,0.04);
          cursor: pointer; color: var(--muted);
          transition: all 0.17s ease;
          font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em;
        }
        .mode-pill:hover { border-color: var(--border-hi); color: var(--text); }
        .mode-pill.active {
          border-color: rgba(56,217,255,0.48);
          background: rgba(56,217,255,0.10);
          color: var(--text);
          box-shadow: 0 4px 14px rgba(56,217,255,0.12);
        }
        .mode-em { font-size: 15px; }

        /* ── Settings ── */
        .settings-row { display: grid; grid-template-columns: repeat(3,1fr); gap: 7px; margin-bottom: 16px; }
        .setting-box {
          background: rgba(255,255,255,0.04);
          border: 1px solid var(--border); border-radius: 12px;
          padding: 10px 12px;
        }
        .setting-box label { font-size: 9px; font-weight: 800; letter-spacing: 0.14em; text-transform: uppercase; color: var(--muted); display: block; margin-bottom: 5px; }
        .setting-sel {
          background: transparent; border: none; color: var(--text);
          font-family: 'DM Sans', sans-serif; font-size: 14px; font-weight: 700;
          outline: none; cursor: pointer; width: 100%;
        }
        .setting-sel option { background: #0d1428; }

        /* ── Custom code ── */
        .custom-wrap { margin-bottom: 18px; }
        .code-input {
          width: 100%; padding: 11px 14px; border-radius: 12px;
          background: rgba(255,255,255,0.05); border: 1px solid var(--border);
          color: var(--text); font-family: 'Syne', sans-serif; font-size: 16px; font-weight: 700;
          text-transform: uppercase; letter-spacing: 0.2em; text-align: center;
          outline: none; transition: border-color 0.2s, box-shadow 0.2s;
        }
        .code-input:focus { border-color: rgba(56,217,255,0.38); box-shadow: 0 0 0 3px rgba(56,217,255,0.08); }
        .code-input::placeholder { color: var(--muted); letter-spacing: 0.1em; font-size: 11px; font-family: 'DM Sans',sans-serif; }

        /* ── Tabs ── */
        .tabs {
          display: grid; grid-template-columns: 1fr 1fr; gap: 4px;
          padding: 4px; border-radius: 16px;
          background: rgba(255,255,255,0.04); border: 1px solid var(--border);
          margin-bottom: 18px;
        }
        .tab-btn {
          padding: 10px; border-radius: 11px; border: none;
          font-family: 'DM Sans', sans-serif; font-size: 13px; font-weight: 700;
          cursor: pointer; transition: all 0.2s; color: var(--muted); background: transparent;
        }
        .tab-btn.active {
          background: linear-gradient(135deg, rgba(56,217,255,0.16), rgba(167,139,250,0.13));
          color: var(--text); border: 1px solid rgba(255,255,255,0.12);
          box-shadow: 0 8px 20px rgba(0,0,0,0.22);
        }
        .tab-btn:hover:not(.active) { color: var(--text); }

        /* ── Form fields ── */
        .form-field { margin-bottom: 12px; }
        .field-lbl {
          display: block; font-size: 10px; font-weight: 700; letter-spacing: 0.13em;
          text-transform: uppercase; color: var(--muted); margin-bottom: 7px;
        }
        .txt-input {
          width: 100%; padding: 14px 16px; border-radius: 14px;
          background: rgba(255,255,255,0.06); border: 1px solid var(--border);
          color: var(--text); font-family: 'DM Sans', sans-serif; font-size: 15px;
          outline: none; transition: border-color 0.2s, box-shadow 0.2s, background 0.2s;
        }
        .txt-input:focus { border-color: rgba(56,217,255,0.38); box-shadow: 0 0 0 3px rgba(56,217,255,0.08); background: rgba(255,255,255,0.09); }
        .txt-input::placeholder { color: var(--muted); }
        .txt-input.is-code { text-transform: uppercase; letter-spacing: 0.2em; font-family: 'Syne',sans-serif; font-size: 18px; font-weight: 700; text-align: center; }

        /* ── Error ── */
        .err-msg {
          background: rgba(251,113,133,0.10); border: 1px solid rgba(251,113,133,0.22);
          color: var(--danger); font-size: 13px; padding: 10px 14px; border-radius: 10px;
          margin-bottom: 12px;
        }

        /* ── CTA buttons ── */
        .cta {
          width: 100%; padding: 16px; border-radius: 16px; border: none;
          font-family: 'Syne', sans-serif; font-size: 15px; font-weight: 900;
          letter-spacing: 0.02em; cursor: pointer;
          transition: transform 0.15s, box-shadow 0.15s, opacity 0.15s;
          margin-bottom: 10px;
        }
        .cta:hover:not(:disabled) { transform: translateY(-2px); }
        .cta:active:not(:disabled) { transform: translateY(0); }
        .cta:disabled { opacity: 0.4; cursor: not-allowed; }
        .cta-cyan {
          background: linear-gradient(135deg, var(--accent), #74e8ff);
          color: #041018;
          box-shadow: 0 14px 36px rgba(56,217,255,0.28);
        }
        .cta-cyan:hover:not(:disabled) { box-shadow: 0 20px 48px rgba(56,217,255,0.40); }
        .cta-violet {
          background: linear-gradient(135deg, var(--accent2), #c4b5fd);
          color: #08051a;
          box-shadow: 0 14px 36px rgba(167,139,250,0.26);
        }
        .cta-violet:hover:not(:disabled) { box-shadow: 0 20px 48px rgba(167,139,250,0.38); }

        /* ── Quick actions ── */
        .quick-row { display: grid; grid-template-columns: 1fr 1fr; gap: 7px; }
        .quick-btn {
          padding: 10px 12px; border-radius: 12px;
          border: 1px solid var(--border); background: rgba(255,255,255,0.04);
          color: var(--muted); font-family: 'DM Sans', sans-serif; font-size: 12px; font-weight: 700;
          cursor: pointer; transition: all 0.17s ease;
          display: flex; align-items: center; justify-content: center; gap: 5px;
        }
        .quick-btn:hover:not(:disabled) { background: rgba(255,255,255,0.08); color: var(--text); border-color: var(--border-hi); }
        .quick-btn:disabled { opacity: 0.4; cursor: not-allowed; }

        /* ── Divider ── */
        .divider { border: none; border-top: 1px solid var(--border); margin: 20px 0; }

        /* ── Google sign-in button ── */
        .google-btn {
          display: inline-flex; align-items: center; gap: 5px;
          padding: 4px 10px; border-radius: 8px;
          border: 1px solid rgba(255,255,255,0.12);
          background: rgba(255,255,255,0.06);
          color: var(--muted); font-size: 11px; font-weight: 700;
          cursor: pointer; transition: all 0.17s ease;
        }
        .google-btn:hover { background: rgba(255,255,255,0.10); color: var(--text); border-color: rgba(255,255,255,0.20); }

        /* ── Footer ── */
        .site-footer {
          position: relative; z-index: 1;
          padding: 20px;
          display: flex; align-items: center; justify-content: center; gap: 20px;
          border-top: 1px solid var(--border);
          flex-wrap: wrap;
        }
        .footer-link {
          color: var(--muted); font-size: 12px; font-weight: 600; text-decoration: none;
          transition: color 0.15s;
        }
        .footer-link:hover { color: var(--text); }
        .footer-sep { color: var(--border); font-size: 12px; }

        /* ── Feature strip ── */
        .feat-strip { display: grid; grid-template-columns: repeat(4,1fr); gap: 7px; }
        .feat-item {
          background: rgba(255,255,255,0.03); border: 1px solid var(--border);
          border-radius: 13px; padding: 12px 8px; text-align: center;
        }
        .feat-ic  { font-size: 17px; display: block; margin-bottom: 4px; }
        .feat-nm  { font-family: 'Syne',sans-serif; font-size: 11px; font-weight: 800; margin-bottom: 2px; }
        .feat-st  { font-size: 10px; color: var(--muted); }
      `}</style>

      {/* Animated background — CSS-only blobs, transform-only animations */}
      <div className="aurora-bg" aria-hidden="true">
        <div className="blob blob-1" />
        <div className="blob blob-2" />
        <div className="blob blob-3" />
        <div className="blob blob-4" />
      </div>

      <div className="page-root">
        <div className="page-inner">

          {/* ── Hero column ── */}
          <div className="hero-col">
            <div className="hero-live">
              <span className="live-dot" />
              <span className="live-text">Multiplayer · Live</span>
            </div>

            <h1 className="hero-title">
              <span className="title-line">Rush</span>
              <span className="title-line title-grad">Party</span>
              <span className="title-line">Games</span>
            </h1>

            <p className="hero-desc">
              11 game modes, real-time multiplayer, global leaderboard. No account needed — create a room in seconds and share the code with friends.
            </p>

            <div className="hero-features">
              {["🌍 150+ flags", "🏷️ 100+ logos", "⚡ Speed scoring", "🔥 Streaks", "🛡️ Power-ups", "🏆 Leaderboard", "🔢 Math Rush", "✅ True/False"].map(p => (
                <span key={p} className="hero-pill">{p}</span>
              ))}
            </div>
          </div>

          {/* ── Card column ── */}
          <div className="main-card">

            {tab === "create" && (
              <>
                {/* Game picker */}
                <span className="sec-label">Choose a game</span>
                <div className="game-grid">
                  {PARTY_GAMES.map(g => (
                    <button
                      key={g.value}
                      type="button"
                      className={`game-btn${gameType === g.value ? " active" : ""}`}
                      style={gameType === g.value ? { "--gc": g.color, "--gb": g.bg } as React.CSSProperties : {}}
                      onClick={() => setGameType(g.value)}
                    >
                      <span className="game-em">{g.emoji}</span>
                      <div className="game-info">
                        <div className="game-name">{g.label}</div>
                        <div className="game-desc">{g.desc}</div>
                      </div>
                    </button>
                  ))}
                </div>

                {/* Mode selector */}
                {gameType === "logo-flag" && (
                  <>
                    <span className="sec-label">Logo / Flag mode</span>
                    <div className="mode-row">
                      {MODES.map(m => (
                        <button
                          key={m.value}
                          type="button"
                          className={`mode-pill${gameMode === m.value ? " active" : ""}`}
                          onClick={() => setGameMode(m.value)}
                        >
                          <span className="mode-em">{m.emoji}</span>
                          {m.label}
                        </button>
                      ))}
                    </div>
                  </>
                )}

                {/* Settings */}
                <span className="sec-label">Settings</span>
                <div className="settings-row">
                  <div className="setting-box">
                    <label>Rounds</label>
                    <select className="setting-sel" value={rounds} onChange={e => setRounds(Number(e.target.value))}>
                      {[5, 10, 15, 20].map(n => <option key={n} value={n}>{n}</option>)}
                    </select>
                  </div>
                  <div className="setting-box">
                    <label>Timer</label>
                    <select className="setting-sel" value={timerSeconds} onChange={e => setTimerSeconds(Number(e.target.value))}>
                      {[10, 15, 20].map(n => <option key={n} value={n}>{n}s</option>)}
                    </select>
                  </div>
                  <div className="setting-box">
                    <label>Difficulty</label>
                    <select className="setting-sel" value={difficulty} onChange={e => setDifficulty(e.target.value as Difficulty | "all")}>
                      <option value="all">All</option>
                      <option value="easy">Easy</option>
                      <option value="medium">Medium</option>
                      <option value="hard">Hard</option>
                    </select>
                  </div>
                </div>

                {/* Custom code */}
                <div className="custom-wrap">
                  <span className="sec-label">Custom room code (optional)</span>
                  <input
                    className="code-input"
                    placeholder="e.g. PARTY1"
                    value={customCode}
                    onChange={e => setCustomCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8))}
                    maxLength={8}
                  />
                </div>

                {/* Room password */}
                <div className="custom-wrap" style={{ marginBottom: 0 }}>
                  <span className="sec-label">Room password (optional — private rooms only)</span>
                  <input
                    className="txt-input"
                    type="text"
                    placeholder="Leave blank for public room"
                    value={roomPassword}
                    onChange={e => setRoomPassword(e.target.value)}
                    maxLength={20}
                  />
                </div>
              </>
            )}

            {/* Tabs */}
            <div className="tabs">
              <button className={`tab-btn${tab === "create" ? " active" : ""}`} onClick={() => { setTab("create"); setJoinError(""); }}>
                ✦ Create Room
              </button>
              <button className={`tab-btn${tab === "join" ? " active" : ""}`} onClick={() => { setTab("join"); setJoinError(""); }}>
                → Join Room
              </button>
            </div>

            {/* Create form */}
            {tab === "create" && (
              <div key="create">
                <div className="form-field">
                  <label className="field-lbl" style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                    <span>Your name</span>
                    <button type="button" className="google-btn" onClick={signInWithGoogle}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" style={{ flexShrink:0 }}>
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                      </svg>
                      Sign in with Google
                    </button>
                  </label>
                  <input
                    className="txt-input"
                    placeholder="Enter your name…"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && !loading && name.trim() && createRoom()}
                    maxLength={20}
                  />
                </div>
                {joinError && <div className="err-msg">⚠ {joinError}</div>}
                <button className="cta cta-cyan" onClick={createRoom} disabled={!name.trim() || loading}>
                  {loading ? "Creating room…" : `${selectedGame?.emoji || "🎮"} Start ${selectedGame?.label || "Game"} →`}
                </button>
                <div className="quick-row">
                  <button className="quick-btn" onClick={createSoloGame} disabled={!name.trim() || loading}>🎯 Solo Practice</button>
                  <button className="quick-btn" onClick={createDailyChallenge} disabled={!name.trim() || loading}>📅 Daily Challenge</button>
                </div>
              </div>
            )}

            {/* Join form */}
            {tab === "join" && (
              <div key="join">
                {recentRooms.length > 0 && (
                  <div style={{ marginBottom: 16 }}>
                    <span className="sec-label">Recent rooms</span>
                    <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
                      {recentRooms.map(r => (
                        <button
                          key={r.code}
                          type="button"
                          className="quick-btn"
                          style={{ fontSize:11 }}
                          onClick={() => { setJoinCode(r.code); setJoinError(""); }}
                        >
                          {r.code}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <div className="form-field">
                  <label className="field-lbl" style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                    <span>Your name</span>
                    <button type="button" className="google-btn" onClick={signInWithGoogle}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" style={{ flexShrink:0 }}>
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                      </svg>
                      Sign in with Google
                    </button>
                  </label>
                  <input
                    className="txt-input"
                    placeholder="Enter your name…"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    maxLength={20}
                  />
                </div>
                <div className="form-field">
                  <label className="field-lbl">Room code</label>
                  <input
                    className="txt-input is-code"
                    placeholder="XXXXX"
                    value={joinCode}
                    onChange={e => { setJoinCode(e.target.value.toUpperCase()); setJoinError(""); }}
                    onKeyDown={e => e.key === "Enter" && !loading && name.trim() && joinCode.trim() && joinRoom()}
                    maxLength={8}
                  />
                </div>
                <div className="form-field">
                  <label className="field-lbl">Room password (if required)</label>
                  <input
                    className="txt-input"
                    type="text"
                    placeholder="Leave blank if no password"
                    value={joinPassword}
                    onChange={e => { setJoinPassword(e.target.value); setJoinError(""); }}
                    maxLength={20}
                  />
                </div>
                {joinError && <div className="err-msg">⚠ {joinError}</div>}
                <button className="cta cta-violet" onClick={joinRoom} disabled={!name.trim() || !joinCode.trim() || loading}>
                  {loading ? "Joining…" : "Join Room →"}
                </button>
              </div>
            )}

            <hr className="divider" />

            {/* Feature strip */}
            <div className="feat-strip">
              {[
                { ic: "🌍", nm: "Flags",  st: "150+ countries" },
                { ic: "🏷️", nm: "Logos",  st: "100+ brands" },
                { ic: "⚡",  nm: "Speed",  st: "Fast = more pts" },
                { ic: "🏆",  nm: "Daily",  st: "New challenge" },
              ].map(f => (
                <div key={f.nm} className="feat-item">
                  <span className="feat-ic">{f.ic}</span>
                  <div className="feat-nm">{f.nm}</div>
                  <div className="feat-st">{f.st}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="site-footer">
        <a href="/leaderboard" className="footer-link">🏆 Leaderboard</a>
        <span className="footer-sep">·</span>
        <a href="/privacy" className="footer-link">Privacy Policy</a>
        <span className="footer-sep">·</span>
        <a href="/tos" className="footer-link">Terms of Service</a>
        <span className="footer-sep">·</span>
        <span className="footer-link" style={{ cursor:"default" }}>© 2025 XO Guess</span>
      </footer>
    </>
  );
}
