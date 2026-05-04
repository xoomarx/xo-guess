"use client";

import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { useParams } from "next/navigation";
import { onValue, ref, update, serverTimestamp } from "firebase/database";
import { signInAnonymously } from "firebase/auth";
import { auth, db } from "../../../lib/firebase";
import { getRandomQuestion, isCorrectAnswer } from "../../../lib/questions";

const TIMER_SECONDS = 15;
const TOTAL_ROUNDS = 10;
const REVEAL_SECONDS = 3;

type Player = { name: string; score: number };
type Question = {
  type: "flag" | "logo";
  imageUrl: string;
  answer: string;
  acceptedAnswers: string[];
};
type Room = {
  hostId: string;
  status?: "lobby" | "playing" | "ended";
  currentQuestion?: Question;
  questionIndex?: number;
  usedQuestionIndexes?: number[];
  roundStartedAt?: number;
  roundNumber?: number;
  totalRounds?: number;
  phase?: "question" | "reveal";
  revealStartedAt?: number;
  roundAnswers?: Record<string, Record<string, { correct: boolean }>>;
  players?: Record<string, Player>;
};
type SoundName = "correct" | "wrong" | "timer" | "gameover";

export default function RoomPage() {
  const params = useParams();
  const roomCode = params.roomCode as string;

  const [room, setRoom] = useState<Room | null | undefined>(undefined);
  const [uid, setUid] = useState("");
  const [name, setName] = useState("");
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState<{ text: string; ok: boolean } | null>(null);
  const [prevScores, setPrevScores] = useState<Record<string, number>>({});
  const [justScored, setJustScored] = useState<Record<string, boolean>>({});
  const [displayScores, setDisplayScores] = useState<Record<string, number>>({});
  const [scorePopups, setScorePopups] = useState<Record<string, number>>({});
  const [timeLeft, setTimeLeft] = useState(TIMER_SECONDS);
  const [serverOffset, setServerOffset] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [lastPhase, setLastPhase] = useState<string | null>(null);
  const [gameEnded, setGameEnded] = useState(false);
  const [copied, setCopied] = useState(false);

  const soundsRef = useRef<Record<SoundName, HTMLAudioElement | null>>({
    correct: null, wrong: null, timer: null, gameover: null,
  });

  const isHost = Boolean(uid && room?.hostId === uid);

  useEffect(() => {
    soundsRef.current.correct = new Audio("/sounds/correct.mp3");
    soundsRef.current.wrong = new Audio("/sounds/wrong.mp3");
    soundsRef.current.timer = new Audio("/sounds/timer.mp3");
    soundsRef.current.gameover = new Audio("/sounds/gameover.mp3");
    Object.values(soundsRef.current).forEach((audio) => {
      if (audio) { audio.volume = 0.6; audio.preload = "auto"; }
    });
  }, []);

  function playSound(name: SoundName) {
    const audio = soundsRef.current[name];
    if (!audio) return;
    audio.currentTime = 0;
    audio.play().catch(() => {});
  }

  function enableSound() {
    const audio = soundsRef.current.correct;
    if (!audio) return;
    audio.currentTime = 0;
    audio.volume = 0.3;
    audio.play().then(() => { audio.volume = 0.6; setSoundEnabled(true); }).catch(() => {});
  }

  useEffect(() => {
    const savedName = localStorage.getItem("name");
    if (savedName) setName(savedName);
  }, []);

  useEffect(() => {
    if (auth.currentUser) setUid(auth.currentUser.uid);
    else signInAnonymously(auth).then((result) => setUid(result.user.uid));
  }, []);

  useEffect(() => {
    const roomRef = ref(db, `rooms/${roomCode}`);
    const unsubscribe = onValue(roomRef, (snapshot) => {
      setRoom(snapshot.exists() ? snapshot.val() : null);
    });
    return () => unsubscribe();
  }, [roomCode]);

  useEffect(() => {
    if (room?.phase === "reveal" && lastPhase !== "reveal") {
      if (soundEnabled) playSound("timer");
      setLastPhase("reveal");
    }
    if (room?.phase === "question") setLastPhase("question");
  }, [room?.phase, soundEnabled, lastPhase]);

  useEffect(() => {
    if (room?.status === "ended" && !gameEnded) {
      if (soundEnabled) playSound("gameover");
      setGameEnded(true);
    }
    if (room?.status !== "ended") setGameEnded(false);
  }, [room?.status, soundEnabled, gameEnded]);

  useEffect(() => {
    if (!room?.players) return;
    const newScores: Record<string, number> = {};
    Object.values(room.players).forEach((player) => { newScores[player.name] = player.score; });
    setPrevScores((prev) => {
      if (Object.keys(prev).length === 0) { setDisplayScores(newScores); return newScores; }
      Object.entries(newScores).forEach(([playerName, score]) => {
        const oldScore = prev[playerName] ?? 0;
        const gained = score - oldScore;
        if (gained > 0) {
          let current = oldScore;
          setJustScored((s) => ({ ...s, [playerName]: true }));
          setScorePopups((s) => ({ ...s, [playerName]: gained }));
          const interval = setInterval(() => {
            current += 1;
            setDisplayScores((s) => ({ ...s, [playerName]: current }));
            if (current >= score) clearInterval(interval);
          }, 120);
          setTimeout(() => {
            setJustScored((s) => ({ ...s, [playerName]: false }));
            setScorePopups((s) => { const copy = { ...s }; delete copy[playerName]; return copy; });
          }, 1200);
        }
      });
      return newScores;
    });
  }, [room?.players]);

  useEffect(() => {
    const offsetRef = ref(db, ".info/serverTimeOffset");
    const unsubscribe = onValue(offsetRef, (snapshot) => { setServerOffset(snapshot.val() || 0); });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (room?.status !== "playing") return;
    const interval = setInterval(() => {
      const serverNow = Date.now() + serverOffset;
      if (room.phase === "reveal" && room.revealStartedAt) {
        const elapsed = Math.floor((serverNow - room.revealStartedAt) / 1000);
        const remaining = Math.max(REVEAL_SECONDS - elapsed, 0);
        setTimeLeft(remaining);
        if (remaining === 0 && isHost) { clearInterval(interval); nextQuestion(); }
        return;
      }
      if (!room.roundStartedAt) return;
      const elapsed = Math.floor((serverNow - room.roundStartedAt) / 1000);
      const remaining = Math.max(TIMER_SECONDS - elapsed, 0);
      setTimeLeft(remaining);
      if (remaining === 0 && isHost && room.phase !== "reveal") {
        clearInterval(interval);
        update(ref(db, `rooms/${roomCode}`), { phase: "reveal", revealStartedAt: serverTimestamp() });
      }
    }, 300);
    return () => clearInterval(interval);
  }, [room?.status, room?.roundStartedAt, room?.revealStartedAt, room?.phase, room?.questionIndex, serverOffset, isHost]);

  async function joinRoom() {
    if (!uid) return;
    const playerName = name.trim();
    if (!playerName) return;
    localStorage.setItem("name", playerName);
    await update(ref(db, `rooms/${roomCode}/players/${uid}`), {
      name: playerName,
      score: room?.players?.[uid]?.score || 0,
    });
  }

  async function startGame() {
    const random = getRandomQuestion([]);
    await update(ref(db, `rooms/${roomCode}`), {
      status: "playing",
      questionIndex: random.index,
      roundNumber: 1,
      totalRounds: TOTAL_ROUNDS,
      usedQuestionIndexes: [random.index],
      currentQuestion: random.question,
      roundStartedAt: serverTimestamp(),
      roundAnswers: {},
      phase: "question",
      revealStartedAt: null,
    });
    setAnswer(""); setFeedback(null);
  }

  async function nextQuestion() {
    const currentRound = room?.roundNumber || 1;
    if (currentRound >= TOTAL_ROUNDS) {
      await update(ref(db, `rooms/${roomCode}`), { status: "ended" });
      return;
    }
    const used = room?.usedQuestionIndexes || [];
    const random = getRandomQuestion(used);
    await update(ref(db, `rooms/${roomCode}`), {
      status: "playing",
      questionIndex: random.index,
      roundNumber: currentRound + 1,
      usedQuestionIndexes: [...used, random.index],
      currentQuestion: random.question,
      roundStartedAt: serverTimestamp(),
      phase: "question",
      revealStartedAt: null,
    });
    setAnswer(""); setFeedback(null);
  }

  async function submitAnswer() {
    if (!room?.currentQuestion || room.phase === "reveal" || !uid) return;
    if (timeLeft <= 0) { setFeedback({ text: "Time is up!", ok: false }); return; }
    const questionKey = String(room.questionIndex);
    if (room.roundAnswers?.[questionKey]?.[uid]?.correct) { setFeedback({ text: "Already answered!", ok: false }); return; }
    const correct = isCorrectAnswer(answer, room.currentQuestion);
    if (!correct) {
      playSound("wrong");
      setAnswer("");
      setFeedback({ text: "Wrong — try again!", ok: false });
      return;
    }
    const currentScore = room.players?.[uid]?.score || 0;
    const serverNow = Date.now() + serverOffset;
    const elapsed = Math.floor((serverNow - (room.roundStartedAt || serverNow)) / 1000);
    const remaining = Math.max(TIMER_SECONDS - elapsed, 0);
    const earnedPoints = remaining >= 11 ? 3 : remaining >= 6 ? 2 : 1;
    await update(ref(db, `rooms/${roomCode}`), {
      [`players/${uid}/score`]: currentScore + earnedPoints,
      [`roundAnswers/${questionKey}/${uid}`]: { correct: true },
    });
    playSound("correct");
    setFeedback({ text: `+${earnedPoints} pts! ⚡`, ok: true });
    setAnswer("");
  }

  function copyInvite() {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const timerPct = room?.phase === "reveal"
    ? (timeLeft / REVEAL_SECONDS) * 100
    : (timeLeft / TIMER_SECONDS) * 100;

  const timerColor = timerPct > 50 ? '#4af0a0' : timerPct > 25 ? '#f0c040' : '#f05a4a';

  if (room === undefined) return (
    <main style={{ minHeight: '100vh', background: '#080c14', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center', color: '#5a6a80', fontFamily: 'DM Sans, sans-serif' }}>
        <div style={{ fontSize: 40, marginBottom: 16 }}>⏳</div>
        <p>Loading room…</p>
      </div>
    </main>
  );

  if (room === null) return (
    <main style={{ minHeight: '100vh', background: '#080c14', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center', color: '#5a6a80', fontFamily: 'DM Sans, sans-serif' }}>
        <div style={{ fontSize: 40, marginBottom: 16 }}>🚫</div>
        <p>Room not found</p>
      </div>
    </main>
  );

  const players = Object.values(room.players || {});
  const questionKey = String(room.questionIndex);
  const alreadyAnswered = uid ? room.roundAnswers?.[questionKey]?.[uid]?.correct : false;
  const correctPlayerIds = Object.entries(room.roundAnswers?.[questionKey] || {})
    .filter(([, r]) => r.correct).map(([id]) => id);
  const correctPlayers = correctPlayerIds.map((id) => room.players?.[id]?.name).filter(Boolean);
  const sortedPlayers = [...players].sort((a, b) => b.score - a.score);

  return (
    <>
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@300;400;500&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        :root {
          --bg: #080c14;
          --surface: #0e1521;
          --surface2: #131d2e;
          --border: rgba(255,255,255,0.07);
          --accent: #f0c040;
          --accent2: #4af0a0;
          --danger: #f05a4a;
          --text: #e8edf5;
          --muted: #5a6a80;
        }
        body { background: var(--bg); color: var(--text); font-family: 'DM Sans', sans-serif; min-height: 100vh; }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes popIn {
          0% { transform: scale(0.8); opacity: 0; }
          60% { transform: scale(1.08); }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes floatPoints {
          0% { opacity: 0; transform: translateY(4px) scale(0.8); }
          20% { opacity: 1; transform: translateY(-4px) scale(1.1); }
          100% { opacity: 0; transform: translateY(-28px) scale(1); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-6px); }
          40% { transform: translateX(6px); }
          60% { transform: translateX(-4px); }
          80% { transform: translateX(4px); }
        }
        @keyframes reveal-in {
          from { opacity: 0; transform: scale(0.95) translateY(8px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }

        .page-layout {
          display: grid;
          grid-template-columns: 1fr 280px;
          gap: 16px;
          max-width: 900px;
          margin: 0 auto;
          padding: 20px;
          min-height: 100vh;
          align-items: start;
        }

        @media (max-width: 700px) {
          .page-layout { grid-template-columns: 1fr; }
          .sidebar { order: 2; }
        }

        .card {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 20px;
          padding: 24px;
        }

        .room-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          flex-wrap: wrap;
          margin-bottom: 20px;
        }

        .room-title {
          font-family: 'Syne', sans-serif;
          font-size: 22px;
          font-weight: 800;
          letter-spacing: -0.02em;
        }

        .room-code {
          font-family: 'DM Sans', monospace;
          font-size: 12px;
          color: var(--muted);
          margin-top: 2px;
        }

        .btn-row { display: flex; gap: 8px; flex-wrap: wrap; }

        .btn {
          padding: 9px 16px;
          border-radius: 10px;
          border: none;
          font-family: 'DM Sans', sans-serif;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: transform 0.12s, opacity 0.12s;
        }
        .btn:hover:not(:disabled) { transform: translateY(-1px); }
        .btn:disabled { opacity: 0.4; cursor: not-allowed; }

        .btn-ghost {
          background: var(--surface2);
          border: 1px solid var(--border);
          color: var(--text);
        }

        .btn-primary {
          background: var(--accent);
          color: #080c14;
          font-weight: 700;
          box-shadow: 0 4px 20px rgba(240,192,64,0.2);
        }

        .btn-green {
          background: var(--accent2);
          color: #080c14;
          font-weight: 700;
          box-shadow: 0 4px 20px rgba(74,240,160,0.2);
        }

        /* Timer ring */
        .timer-wrap {
          display: flex;
          align-items: center;
          gap: 14px;
        }

        .timer-ring-wrap {
          position: relative;
          width: 64px;
          height: 64px;
          flex-shrink: 0;
        }

        .timer-ring-wrap svg {
          transform: rotate(-90deg);
        }

        .timer-number {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: 'Syne', sans-serif;
          font-size: 20px;
          font-weight: 800;
        }

        /* Round info */
        .round-label {
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          color: var(--muted);
          margin-bottom: 2px;
        }

        .round-value {
          font-family: 'Syne', sans-serif;
          font-size: 18px;
          font-weight: 800;
        }

        /* Progress dots */
        .round-dots {
          display: flex;
          gap: 5px;
          margin-top: 16px;
          flex-wrap: wrap;
        }

        .round-dot {
          width: 28px;
          height: 4px;
          border-radius: 2px;
          background: var(--border);
          transition: background 0.3s;
        }

        .round-dot.done { background: var(--accent2); }
        .round-dot.current { background: var(--accent); animation: pulse 1s ease-in-out infinite; }

        /* Image box */
        .img-box {
          background: white;
          border-radius: 16px;
          padding: 28px;
          margin: 20px 0;
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 200px;
          animation: popIn 0.4s cubic-bezier(0.34,1.56,0.64,1) both;
        }

        .img-box img {
          max-width: 100%;
          max-height: 160px;
          object-fit: contain;
        }

        /* Question type badge */
        .q-type {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: rgba(240,192,64,0.1);
          border: 1px solid rgba(240,192,64,0.2);
          color: var(--accent);
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          padding: 5px 12px;
          border-radius: 100px;
          margin-bottom: 14px;
        }

        /* Answer input */
        .answer-row {
          display: flex;
          gap: 10px;
          margin-top: 4px;
        }

        .answer-input {
          flex: 1;
          background: var(--surface2);
          border: 1px solid var(--border);
          color: var(--text);
          font-family: 'DM Sans', sans-serif;
          font-size: 15px;
          padding: 13px 16px;
          border-radius: 12px;
          outline: none;
          transition: border-color 0.2s, box-shadow 0.2s;
        }

        .answer-input:focus {
          border-color: rgba(240,192,64,0.4);
          box-shadow: 0 0 0 3px rgba(240,192,64,0.07);
        }

        .answer-input::placeholder { color: var(--muted); }
        .answer-input:disabled { opacity: 0.5; cursor: not-allowed; }

        .feedback-ok {
          font-size: 14px;
          font-weight: 600;
          color: var(--accent2);
          margin-top: 10px;
          animation: fadeUp 0.2s ease;
        }

        .feedback-err {
          font-size: 14px;
          color: var(--danger);
          margin-top: 10px;
          animation: shake 0.35s ease;
        }

        /* Reveal */
        .reveal-box {
          background: rgba(8,18,36,0.8);
          border: 1px solid rgba(74,240,160,0.25);
          border-radius: 16px;
          padding: 20px;
          text-align: center;
          margin-bottom: 18px;
          animation: reveal-in 0.35s cubic-bezier(0.34,1.56,0.64,1) both;
        }

        .reveal-label {
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.12em;
          color: var(--muted);
          margin-bottom: 8px;
        }

        .reveal-answer {
          font-family: 'Syne', sans-serif;
          font-size: 32px;
          font-weight: 800;
          color: var(--accent);
          margin-bottom: 14px;
        }

        .correct-player-chip {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: rgba(74,240,160,0.1);
          border: 1px solid rgba(74,240,160,0.25);
          color: var(--accent2);
          padding: 5px 12px;
          border-radius: 100px;
          font-size: 13px;
          font-weight: 500;
          margin: 3px;
        }

        .reveal-next {
          font-size: 12px;
          color: var(--muted);
          margin-top: 12px;
        }

        /* Sidebar */
        .sidebar { display: flex; flex-direction: column; gap: 16px; }

        .sidebar-title {
          font-family: 'Syne', sans-serif;
          font-size: 13px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          color: var(--muted);
          margin-bottom: 14px;
        }

        .player-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 11px 14px;
          border-radius: 12px;
          background: var(--surface2);
          border: 1px solid var(--border);
          margin-bottom: 8px;
          transition: background 0.3s, border-color 0.3s, box-shadow 0.3s;
          position: relative;
          overflow: visible;
        }

        .player-row.scoring {
          background: rgba(74,240,160,0.07);
          border-color: rgba(74,240,160,0.3);
          box-shadow: 0 0 16px rgba(74,240,160,0.12);
        }

        .player-rank {
          font-size: 11px;
          color: var(--muted);
          font-weight: 600;
          margin-right: 10px;
          min-width: 16px;
        }

        .player-rank.gold { color: #f0c040; }
        .player-rank.silver { color: #a0b0c8; }
        .player-rank.bronze { color: #c88060; }

        .player-name {
          flex: 1;
          font-size: 14px;
          font-weight: 500;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .player-score {
          font-family: 'Syne', sans-serif;
          font-size: 15px;
          font-weight: 700;
          color: var(--accent);
        }

        .score-popup {
          position: absolute;
          right: 14px;
          top: -14px;
          font-family: 'Syne', sans-serif;
          font-size: 13px;
          font-weight: 800;
          color: var(--accent2);
          pointer-events: none;
          animation: floatPoints 1.2s ease-out forwards;
        }

        /* Game over */
        .gameover-wrap {
          text-align: center;
          padding: 20px 0;
          animation: fadeUp 0.4s ease;
        }

        .gameover-emoji {
          font-size: 56px;
          margin-bottom: 12px;
        }

        .gameover-title {
          font-family: 'Syne', sans-serif;
          font-size: 28px;
          font-weight: 800;
          margin-bottom: 6px;
        }

        .gameover-sub {
          font-size: 14px;
          color: var(--muted);
          margin-bottom: 24px;
        }

        /* Lobby */
        .lobby-wrap { animation: fadeUp 0.4s ease; }

        .join-input {
          width: 100%;
          background: var(--surface2);
          border: 1px solid var(--border);
          color: var(--text);
          font-family: 'DM Sans', sans-serif;
          font-size: 15px;
          padding: 13px 16px;
          border-radius: 12px;
          outline: none;
          margin-bottom: 12px;
          transition: border-color 0.2s;
        }

        .join-input:focus { border-color: rgba(240,192,64,0.4); }
        .join-input::placeholder { color: var(--muted); }

        .waiting-label {
          font-size: 13px;
          color: var(--muted);
          display: flex;
          align-items: center;
          gap: 8px;
          margin-top: 16px;
        }

        .dot-pulse {
          display: inline-block;
          width: 6px; height: 6px;
          border-radius: 50%;
          background: var(--accent2);
          animation: pulse 1.2s ease-in-out infinite;
        }
      `}</style>

      <div className="page-layout">
        {/* MAIN COLUMN */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Header card */}
          <div className="card">
            <div className="room-header">
              <div>
                <div className="room-title">Logo & Flag Rush</div>
                <div className="room-code">Room · {roomCode}</div>
              </div>
              <div className="btn-row">
                <button className="btn btn-ghost" onClick={copyInvite}>
                  {copied ? '✓ Copied!' : '🔗 Invite'}
                </button>
                <button className="btn btn-ghost" onClick={enableSound}>
                  {soundEnabled ? '🔊 On' : '🔇 Sound'}
                </button>
              </div>
            </div>

            {/* Round progress dots */}
            {room.status === 'playing' && (
              <div className="round-dots">
                {Array.from({ length: room.totalRounds || TOTAL_ROUNDS }).map((_, i) => {
                  const roundNum = room.roundNumber || 1;
                  const cls = i < roundNum - 1 ? 'done' : i === roundNum - 1 ? 'current' : '';
                  return <div key={i} className={`round-dot ${cls}`} />;
                })}
              </div>
            )}
          </div>

          {/* LOBBY */}
          {room.status !== 'playing' && room.status !== 'ended' && (
            <div className="card lobby-wrap">
              <div style={{ marginBottom: 20 }}>
                <div className="round-label">Waiting for players</div>
                <div className="round-value" style={{ fontSize: 22, marginTop: 4 }}>Lobby</div>
              </div>

              <input
                className="join-input"
                placeholder="Your name…"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && joinRoom()}
                maxLength={20}
              />

              <div className="btn-row">
                <button className="btn btn-primary" onClick={joinRoom} disabled={!name.trim()}>
                  Join Game
                </button>
                {isHost && (
                  <button className="btn btn-green" onClick={startGame} disabled={players.length === 0}>
                    ▶ Start Game
                  </button>
                )}
              </div>

              <div className="waiting-label">
                <span className="dot-pulse" />
                {players.length} player{players.length !== 1 ? 's' : ''} in lobby
              </div>
            </div>
          )}

          {/* PLAYING */}
          {room.status === 'playing' && room.currentQuestion && (() => {
            const isReveal = room.phase === 'reveal';
            const maxTime = isReveal ? REVEAL_SECONDS : TIMER_SECONDS;
            const circumference = 2 * Math.PI * 26;
            const dashOffset = circumference * (1 - timeLeft / maxTime);

            return (
              <div className="card" style={{ animation: 'fadeUp 0.35s ease' }}>
                {/* Top row: round + timer */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                  <div>
                    <div className="round-label">Round</div>
                    <div className="round-value">{room.roundNumber || 1} / {room.totalRounds || TOTAL_ROUNDS}</div>
                  </div>

                  <div className="timer-wrap">
                    <div className="timer-ring-wrap">
                      <svg width="64" height="64" viewBox="0 0 64 64">
                        <circle cx="32" cy="32" r="26" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="5" />
                        <circle
                          cx="32" cy="32" r="26"
                          fill="none"
                          stroke={timerColor}
                          strokeWidth="5"
                          strokeLinecap="round"
                          strokeDasharray={circumference}
                          strokeDashoffset={dashOffset}
                          style={{ transition: 'stroke-dashoffset 0.3s linear, stroke 0.3s' }}
                        />
                      </svg>
                      <div className="timer-number" style={{ color: timerColor }}>{timeLeft}</div>
                    </div>
                  </div>
                </div>

                {/* Question type */}
                <div className="q-type">
                  {room.currentQuestion.type === 'flag' ? '🌍 Flag' : '🏷️ Logo'}
                </div>

                {/* Reveal */}
                {isReveal && (
                  <div className="reveal-box">
                    <div className="reveal-label">Correct answer</div>
                    <div className="reveal-answer">{room.currentQuestion.answer}</div>
                    {correctPlayers.length > 0 && (
                      <div style={{ marginBottom: 8 }}>
                        {correctPlayers.map((pName) => (
                          <span key={pName} className="correct-player-chip">✓ {pName}</span>
                        ))}
                      </div>
                    )}
                    <div className="reveal-next">Next in {timeLeft}s…</div>
                  </div>
                )}

                {/* Image */}
                <div className="img-box" key={room.questionIndex}>
                  <img src={room.currentQuestion.imageUrl} alt="Guess this" />
                </div>

                {/* Answer */}
                <div className="answer-row">
                  <input
                    className="answer-input"
                    placeholder={alreadyAnswered ? '✓ Answered!' : 'Type your answer…'}
                    value={answer}
                    onChange={(e) => { setAnswer(e.target.value); setFeedback(null); }}
                    onKeyDown={(e) => e.key === 'Enter' && !alreadyAnswered && !isReveal && submitAnswer()}
                    disabled={isReveal || timeLeft === 0 || !!alreadyAnswered}
                  />
                  <button
                    className="btn btn-primary"
                    onClick={submitAnswer}
                    disabled={isReveal || timeLeft === 0 || !!alreadyAnswered || !answer.trim()}
                  >
                    Submit
                  </button>
                </div>

                {feedback && (
                  <div className={feedback.ok ? 'feedback-ok' : 'feedback-err'}>
                    {feedback.text}
                  </div>
                )}
              </div>
            );
          })()}

          {/* GAME OVER */}
          {room.status === 'ended' && (
            <div className="card gameover-wrap">
              <div className="gameover-emoji">🏆</div>
              <div className="gameover-title">Game Over!</div>
              <div className="gameover-sub">
                {sortedPlayers[0]?.name} wins with {sortedPlayers[0]?.score} points
              </div>
              {isHost && (
                <button className="btn btn-green" onClick={startGame} style={{ margin: '0 auto', display: 'block' }}>
                  ▶ Play Again
                </button>
              )}
            </div>
          )}
        </div>

        {/* SIDEBAR */}
        <div className="sidebar">
          <div className="card">
            <div className="sidebar-title">Leaderboard</div>
            {sortedPlayers.map((player, index) => {
              const rankClass = index === 0 ? 'gold' : index === 1 ? 'silver' : index === 2 ? 'bronze' : '';
              const medals = ['🥇', '🥈', '🥉'];
              return (
                <div
                  key={player.name}
                  className={`player-row ${justScored[player.name] ? 'scoring' : ''}`}
                >
                  {scorePopups[player.name] && (
                    <span className="score-popup">+{scorePopups[player.name]}</span>
                  )}
                  <span className={`player-rank ${rankClass}`}>
                    {index < 3 ? medals[index] : `#${index + 1}`}
                  </span>
                  <span className="player-name">{player.name}</span>
                  <span className="player-score">
                    {displayScores[player.name] ?? player.score}
                  </span>
                </div>
              );
            })}
            {players.length === 0 && (
              <div style={{ color: 'var(--muted)', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>
                No players yet
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
