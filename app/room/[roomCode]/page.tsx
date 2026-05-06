"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { onValue, ref, update, serverTimestamp } from "firebase/database";
import { signInAnonymously } from "firebase/auth";
import { auth, db } from "../../../lib/firebase";
import { getRandomQuestionByMode, isCorrectAnswer } from "../../../lib/questions";
import type { GameMode } from "../../../lib/questions";

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
  gameMode?: GameMode;
};
type SoundName = "correct" | "wrong" | "timer" | "gameover";

// Simple confetti burst helper
function spawnConfetti(container: HTMLElement) {
  const colors = ["#f0c040", "#4af0a0", "#f06060", "#60a0f0", "#f060c0", "#a0f060"];
  for (let i = 0; i < 60; i++) {
    const el = document.createElement("div");
    const color = colors[Math.floor(Math.random() * colors.length)];
    const size = 6 + Math.random() * 8;
    el.style.cssText = `
      position:fixed;width:${size}px;height:${size}px;
      background:${color};border-radius:${Math.random() > 0.5 ? "50%" : "2px"};
      left:${Math.random() * 100}vw;top:-20px;pointer-events:none;z-index:9999;
      transform:rotate(${Math.random() * 360}deg);
      animation:confettiFall ${1.5 + Math.random() * 2}s ease-in ${Math.random() * 0.5}s forwards;
    `;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 3500);
  }
}

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
  const soundUnlockedRef = useRef(false);
  const [lastPhase, setLastPhase] = useState<string | null>(null);
  const [gameEnded, setGameEnded] = useState(false);
  const [copied, setCopied] = useState(false);
  const confettiRef = useRef(false);

  
  const isHost = Boolean(uid && room?.hostId === uid);
  function playSound(name: SoundName) {
    if (!soundUnlockedRef.current && name !== "correct") return;

    const files: Record<SoundName, string> = {
      correct: "/sounds/correct.mp3",
      wrong: "/sounds/wrong.mp3",
      timer: "/sounds/timer.mp3",
      gameover: "/sounds/gameover.mp3",
    };

    const audio = new Audio(files[name]);
    audio.volume = 0.75;

    audio.play().catch((error) => {
      console.log("Sound failed:", name, error);
    });
  }

  function enableSound() {
    const audio = new Audio("/sounds/correct.mp3");
    audio.volume = 0.75;

    audio
      .play()
      .then(() => {
        soundUnlockedRef.current = true;
        setSoundEnabled(true);
      })
      .catch((error) => {
        console.log("Enable sound failed:", error);
      });
  }

  useEffect(() => {
    const savedName = localStorage.getItem("name");
    if (savedName) setName(savedName);
  }, []);

  useEffect(() => {
    if (auth.currentUser) setUid(auth.currentUser.uid);
    else signInAnonymously(auth).then((r) => setUid(r.user.uid));
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
      if (soundEnabled) if (soundUnlockedRef.current) playSound("timer");
      setLastPhase("reveal");
    }
    if (room?.phase === "question") setLastPhase("question");
  }, [room?.phase, soundEnabled]);

  useEffect(() => {
    if (room?.status === "ended" && !gameEnded) {
      if (soundEnabled) if (soundUnlockedRef.current) playSound("gameover");
      setGameEnded(true);
      if (!confettiRef.current) {
        confettiRef.current = true;
        spawnConfetti(document.body);
        setTimeout(() => { confettiRef.current = false; }, 4000);
      }
    }
    if (room?.status !== "ended") setGameEnded(false);
  }, [room?.status, soundEnabled]);

  useEffect(() => {
    if (!room?.players) return;
    const newScores: Record<string, number> = {};
    Object.values(room.players).forEach((p) => { newScores[p.name] = p.score; });
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
          }, 80);
          setTimeout(() => {
            setJustScored((s) => ({ ...s, [playerName]: false }));
            setScorePopups((s) => { const c = { ...s }; delete c[playerName]; return c; });
          }, 1400);
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
    const mode = room?.gameMode || "mix";
    const random = getRandomQuestionByMode([], mode);
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
    const mode = room?.gameMode || "mix";
    const random = getRandomQuestionByMode(used, mode);
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
    if (room.roundAnswers?.[questionKey]?.[uid]?.correct) {
      setFeedback({ text: "Already answered!", ok: false }); return;
    }
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
  const timerColor = timerPct > 50 ? "#4af0a0" : timerPct > 25 ? "#f0c040" : "#f05a4a";
  const timerGlow = timerPct > 50
    ? "rgba(74,240,160,0.4)"
    : timerPct > 25
    ? "rgba(240,192,64,0.4)"
    : "rgba(240,90,74,0.5)";

  // ── Loading / not-found states ──────────────────────────────────────────
  if (room === undefined) return (
    <main style={{ minHeight:"100vh",background:"#05080f",display:"flex",alignItems:"center",justifyContent:"center" }}>
      <div style={{ textAlign:"center",color:"#4a5a72",fontFamily:"DM Sans,sans-serif" }}>
        <div style={{ fontSize:48,marginBottom:16,animation:"spin 1s linear infinite",display:"inline-block" }}>⏳</div>
        <p style={{ fontSize:14 }}>Loading room…</p>
      </div>
    </main>
  );

  if (room === null) return (
    <main style={{ minHeight:"100vh",background:"#05080f",display:"flex",alignItems:"center",justifyContent:"center" }}>
      <div style={{ textAlign:"center",color:"#4a5a72",fontFamily:"DM Sans,sans-serif" }}>
        <div style={{ fontSize:48,marginBottom:16 }}>🚫</div>
        <p style={{ fontSize:14 }}>Room not found</p>
        <a href="/" style={{ display:"inline-block",marginTop:20,color:"#f0c040",fontSize:13 }}>← Back to home</a>
      </div>
    </main>
  );

  const players = Object.values(room.players || {});
  const questionKey = String(room.questionIndex);
  const alreadyAnswered = uid ? room.roundAnswers?.[questionKey]?.[uid]?.correct : false;
  const correctPlayerIds = Object.entries(room.roundAnswers?.[questionKey] || {})
    .filter(([, r]) => r.correct).map(([id]) => id);
  const correctPlayers = correctPlayerIds.map((id) => room.players?.[id]?.name).filter(Boolean) as string[];
  const sortedPlayers = [...players].sort((a, b) => b.score - a.score);

  const circumference = 2 * Math.PI * 28;
  const isReveal = room.phase === "reveal";
  const maxTime = isReveal ? REVEAL_SECONDS : TIMER_SECONDS;
  const dashOffset = circumference * (1 - timeLeft / maxTime);

  return (
    <>
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800;900&family=DM+Sans:wght@300;400;500&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        :root{
          --bg:#050716;--surface:#0d162c;--surface2:#1a2748;--surface3:#23345e;
          --border:rgba(255,255,255,0.10);--border-hi:rgba(255,255,255,0.18);
          --accent:#38d9ff;--accent2:#a78bfa;--danger:#fb7185;
          --text:#f8fbff;--muted:#9aaccf;
        }
        body{
          background:
            radial-gradient(circle at 18% 10%, rgba(56,217,255,0.14), transparent 28%),
            radial-gradient(circle at 86% 18%, rgba(167,139,250,0.16), transparent 30%),
            radial-gradient(circle at 50% 100%, rgba(250,204,21,0.08), transparent 26%),
            linear-gradient(180deg,#050716,#0b1230);
          color:var(--text);font-family:'DM Sans',sans-serif;min-height:100vh;
        }

        @keyframes fadeUp{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:translateY(0)}}
        @keyframes popIn{0%{transform:scale(0.85);opacity:0}60%{transform:scale(1.05)}100%{transform:scale(1);opacity:1}}
        @keyframes floatPoints{0%{opacity:0;transform:translateY(4px) scale(0.85)}20%{opacity:1;transform:translateY(-8px) scale(1.1)}100%{opacity:0;transform:translateY(-36px) scale(1)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}
        @keyframes shake{0%,100%{transform:translateX(0)}20%{transform:translateX(-7px)}40%{transform:translateX(7px)}60%{transform:translateX(-4px)}80%{transform:translateX(4px)}}
        @keyframes reveal-in{from{opacity:0;transform:scale(0.94) translateY(10px)}to{opacity:1;transform:scale(1) translateY(0)}}
        @keyframes shimmer{0%{background-position:-200% center}100%{background-position:200% center}}
        @keyframes glow-pulse{0%,100%{box-shadow:0 0 20px rgba(74,240,160,0.15)}50%{box-shadow:0 0 40px rgba(74,240,160,0.35)}}
        @keyframes confettiFall{to{transform:translateY(110vh) rotate(720deg);opacity:0}}
        @keyframes podium-in{from{opacity:0;transform:translateY(30px)}to{opacity:1;transform:translateY(0)}}
        @keyframes crown-bounce{0%,100%{transform:translateY(0) rotate(-8deg)}50%{transform:translateY(-8px) rotate(8deg)}}
        @keyframes timer-warn{0%,100%{transform:scale(1)}50%{transform:scale(1.06)}}

        /* Layout */
        .page-layout{
          display:grid;grid-template-columns:1fr 272px;gap:16px;
          max-width:920px;margin:0 auto;padding:20px;min-height:100vh;align-items:start;
        }
        @media(max-width:720px){
          .page-layout{grid-template-columns:1fr}
          .sidebar{order:2}
        }

        /* Cards */
        .card{
          background:linear-gradient(180deg, rgba(18,29,58,0.86), rgba(10,17,37,0.86));
          border:1px solid var(--border);
          border-radius:24px;padding:24px;
          box-shadow:0 18px 48px rgba(0,0,0,0.30),0 0 28px rgba(56,217,255,0.06);
          backdrop-filter:blur(14px);
        }
        .card-elevated{
          background:linear-gradient(180deg, rgba(18,29,58,0.90), rgba(10,17,37,0.90));
          border:1px solid var(--border-hi);
          border-radius:26px;padding:26px;
          box-shadow:0 28px 74px rgba(0,0,0,0.45),0 0 34px rgba(56,217,255,0.08);
          backdrop-filter:blur(14px);
        }

        /* Header */
        .room-header{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:20px}
        .room-title{font-family:'Syne',sans-serif;font-size:20px;font-weight:900;letter-spacing:-0.02em}
        .room-code-badge{
          font-family:'Syne',monospace;font-size:11px;font-weight:700;
          letter-spacing:0.15em;color:var(--muted);
          background:var(--surface2);border:1px solid var(--border);
          padding:3px 10px;border-radius:100px;margin-top:3px;display:inline-block;
        }
        .room-mode-badge{
          display:inline-block;margin-top:6px;margin-left:6px;
          font-size:10px;font-weight:800;letter-spacing:0.08em;text-transform:uppercase;
          color:var(--accent);background:rgba(56,217,255,0.10);
          border:1px solid rgba(56,217,255,0.22);
          padding:4px 9px;border-radius:999px;
        }
        .btn-row{display:flex;gap:8px;flex-wrap:wrap}

        /* Buttons */
        .btn{
          padding:10px 17px;border-radius:14px;border:none;
          font-family:'DM Sans',sans-serif;font-size:13px;font-weight:800;
          cursor:pointer;transition:transform 0.14s,opacity 0.12s,background 0.15s,box-shadow 0.15s;
        }
        .btn:hover:not(:disabled){transform:translateY(-1px)}
        .btn:disabled{opacity:0.35;cursor:not-allowed}
        .btn-ghost{background:rgba(255,255,255,0.055);border:1px solid var(--border);color:var(--text);backdrop-filter:blur(8px)}
        .btn-ghost:hover:not(:disabled){background:var(--surface3);border-color:var(--border-hi)}
        .btn-primary{background:linear-gradient(135deg,var(--accent),#8be9ff);color:#04111b;font-weight:900;box-shadow:0 12px 28px rgba(56,217,255,0.24)}
        .btn-green{background:linear-gradient(135deg,var(--accent2),#c4b5fd);color:#05080f;font-weight:900;box-shadow:0 12px 28px rgba(167,139,250,0.22)}

        /* Progress bar */
        .round-track{
          margin-top:16px;height:3px;background:var(--surface2);
          border-radius:100px;overflow:hidden;
        }
        .round-fill{
          height:100%;border-radius:100px;
          background:linear-gradient(90deg,var(--accent2),var(--accent));
          transition:width 0.6s cubic-bezier(0.22,1,0.36,1);
        }
        .round-label{font-size:10px;text-transform:uppercase;letter-spacing:0.12em;color:var(--muted);margin-bottom:2px}
        .round-value{font-family:'Syne',sans-serif;font-size:17px;font-weight:800}

        /* Timer */
        .timer-wrap{display:flex;align-items:center;gap:0}
        .timer-ring-wrap{position:relative;width:68px;height:68px;flex-shrink:0}
        .timer-ring-wrap svg{transform:rotate(-90deg)}
        .timer-number{
          position:absolute;inset:0;display:flex;align-items:center;justify-content:center;
          font-family:'Syne',sans-serif;font-size:21px;font-weight:900;
        }

        /* Question type */
        .q-type-badge{
          display:inline-flex;align-items:center;gap:6px;
          background:rgba(240,192,64,0.09);border:1px solid rgba(240,192,64,0.2);
          color:var(--accent);font-size:10px;font-weight:700;
          letter-spacing:0.12em;text-transform:uppercase;
          padding:5px 13px;border-radius:100px;margin-bottom:16px;
        }

        /* Image box */
        .img-box{
          background:linear-gradient(180deg,rgba(255,255,255,0.98),rgba(238,245,255,0.96));
          border-radius:26px;padding:34px;
          margin:18px 0;display:flex;align-items:center;justify-content:center;
          min-height:220px;position:relative;overflow:hidden;
          animation:popIn 0.45s cubic-bezier(0.34,1.56,0.64,1) both;
          box-shadow:0 18px 44px rgba(0,0,0,0.28),0 0 0 1px rgba(255,255,255,0.45) inset;
        }
        .img-box img{max-width:100%;max-height:160px;object-fit:contain;position:relative;z-index:1}

        /* Answer input */
        .answer-row{display:flex;gap:10px;margin-top:6px}
        .answer-input{
          flex:1;background:var(--surface2);border:1px solid var(--border);
          color:var(--text);font-family:'DM Sans',sans-serif;font-size:15px;
          padding:13px 16px;border-radius:13px;outline:none;
          transition:border-color 0.2s,box-shadow 0.2s;
        }
        .answer-input:focus{border-color:rgba(240,192,64,0.4);box-shadow:0 0 0 3px rgba(240,192,64,0.07)}
        .answer-input::placeholder{color:var(--muted)}
        .answer-input:disabled{opacity:0.45;cursor:not-allowed}
        .answer-input.answered{border-color:rgba(74,240,160,0.4);background:rgba(74,240,160,0.05)}

        .feedback-ok{font-size:14px;font-weight:700;color:var(--accent2);margin-top:10px;animation:fadeUp 0.2s ease}
        .feedback-err{font-size:14px;color:var(--danger);margin-top:10px;animation:shake 0.35s ease;font-weight:500}

        /* Reveal */
        .reveal-box{
          background:linear-gradient(180deg,rgba(56,217,255,0.12),rgba(167,139,250,0.12));
          border:1px solid rgba(56,217,255,0.26);
          border-radius:22px;padding:24px;text-align:center;margin-bottom:16px;
          animation:reveal-in 0.4s cubic-bezier(0.34,1.56,0.64,1) both;
          box-shadow:0 0 42px rgba(56,217,255,0.12);
        }
        .reveal-label{font-size:10px;text-transform:uppercase;letter-spacing:0.15em;color:var(--muted);margin-bottom:10px}
        .reveal-answer{
          font-family:'Syne',sans-serif;font-size:36px;font-weight:900;
          background:linear-gradient(90deg,var(--accent),var(--accent2));
          background-size:200% auto;-webkit-background-clip:text;
          -webkit-text-fill-color:transparent;background-clip:text;
          animation:shimmer 2s linear infinite;margin-bottom:14px;
        }
        .correct-chips{display:flex;flex-wrap:wrap;gap:6px;justify-content:center;margin-bottom:10px}
        .correct-chip{
          display:inline-flex;align-items:center;gap:5px;
          background:rgba(74,240,160,0.1);border:1px solid rgba(74,240,160,0.25);
          color:var(--accent2);padding:5px 12px;border-radius:100px;
          font-size:12px;font-weight:600;
        }
        .reveal-next{font-size:11px;color:var(--muted);margin-top:8px}

        /* Sidebar */
        .sidebar{display:flex;flex-direction:column;gap:16px}
        .sidebar-title{
          font-family:'Syne',sans-serif;font-size:11px;font-weight:700;
          text-transform:uppercase;letter-spacing:0.12em;color:var(--muted);margin-bottom:14px;
        }

        .player-row{
          display:flex;align-items:center;gap:0;
          padding:11px 14px;border-radius:13px;
          background:var(--surface2);border:1px solid var(--border);
          margin-bottom:7px;transition:all 0.3s;position:relative;overflow:visible;
        }
        .player-row.scoring{
          background:rgba(74,240,160,0.06);border-color:rgba(74,240,160,0.25);
          box-shadow:0 0 20px rgba(74,240,160,0.1);animation:glow-pulse 1.5s ease infinite;
        }
        .player-medal{font-size:14px;margin-right:10px;min-width:20px;text-align:center}
        .player-rank-num{font-size:11px;color:var(--muted);font-weight:600;margin-right:10px;min-width:20px}
        .player-name{flex:1;font-size:14px;font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
        .player-score{font-family:'Syne',sans-serif;font-size:15px;font-weight:800;color:var(--accent)}
        .score-popup{
          position:absolute;right:14px;top:-16px;
          font-family:'Syne',sans-serif;font-size:14px;font-weight:900;
          color:var(--accent2);pointer-events:none;
          animation:floatPoints 1.4s ease-out forwards;
        }

        /* Lobby */
        .lobby-wrap{animation:fadeUp 0.4s ease}
        .lobby-title{font-family:'Syne',sans-serif;font-size:24px;font-weight:900;margin-bottom:6px}
        .lobby-sub{font-size:13px;color:var(--muted);margin-bottom:24px}
        .join-input{
          width:100%;background:var(--surface2);border:1px solid var(--border);
          color:var(--text);font-family:'DM Sans',sans-serif;font-size:15px;
          padding:14px 18px;border-radius:14px;outline:none;margin-bottom:12px;
          transition:border-color 0.2s;
        }
        .join-input:focus{border-color:rgba(240,192,64,0.4)}
        .join-input::placeholder{color:var(--muted)}

        .waiting-label{
          font-size:13px;color:var(--muted);
          display:flex;align-items:center;gap:8px;margin-top:16px;
        }
        .dot-pulse{
          display:inline-block;width:7px;height:7px;
          border-radius:50%;background:var(--accent2);
          animation:pulse 1.2s ease-in-out infinite;
        }

        /* Game Over — Podium */
        .gameover-wrap{text-align:center;padding:8px 0 4px;animation:fadeUp 0.5s ease}
        .gameover-trophy{
          font-size:64px;display:block;margin-bottom:8px;
          animation:crown-bounce 2s ease-in-out infinite;
        }
        .gameover-title{
          font-family:'Syne',sans-serif;font-size:36px;font-weight:900;
          background:linear-gradient(90deg,var(--accent),var(--accent2));
          -webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;
          margin-bottom:4px;
        }
        .gameover-winner{font-size:14px;color:var(--muted);margin-bottom:28px}
        .podium{display:flex;align-items:flex-end;justify-content:center;gap:8px;margin-bottom:28px}
        .podium-col{display:flex;flex-direction:column;align-items:center;gap:0}
        .podium-name{font-size:12px;font-weight:600;margin-bottom:6px;max-width:80px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
        .podium-score{font-family:'Syne',sans-serif;font-size:13px;font-weight:800;color:var(--accent);margin-bottom:4px}
        .podium-block{
          width:72px;display:flex;align-items:center;justify-content:center;
          border-radius:10px 10px 0 0;font-family:'Syne',sans-serif;font-size:20px;font-weight:900;
        }
        .podium-block.p1{height:80px;background:linear-gradient(180deg,rgba(240,192,64,0.3),rgba(240,192,64,0.1));border:1px solid rgba(240,192,64,0.4);animation:podium-in 0.6s 0.1s ease both}
        .podium-block.p2{height:56px;background:rgba(160,176,200,0.15);border:1px solid rgba(160,176,200,0.3);animation:podium-in 0.6s 0.25s ease both}
        .podium-block.p3{height:40px;background:rgba(200,128,96,0.12);border:1px solid rgba(200,128,96,0.25);animation:podium-in 0.6s 0.4s ease both}

        /* Sound button active */
        .btn-sound-on{
          background:rgba(74,240,160,0.1);border-color:rgba(74,240,160,0.3);
          color:var(--accent2);
        }
      `}</style>

      <div className="page-layout">
        {/* ── MAIN COLUMN ── */}
        <div style={{ display:"flex",flexDirection:"column",gap:16 }}>

          {/* Header */}
          <div className="card">
            <div className="room-header">
              <div>
                <div className="room-title">Logo & Flag Rush</div>
                <div className="room-code-badge">{roomCode}</div>
                <div className="room-mode-badge">
                  {room.gameMode === "flags"
                    ? "🌍 Flags only"
                    : room.gameMode === "logos"
                    ? "🏷️ Logos only"
                    : "🎲 Mixed game"}
                </div>
              </div>
              <div className="btn-row">
                <button className="btn btn-ghost" onClick={copyInvite}>
                  {copied ? "✓ Copied!" : "🔗 Invite"}
                </button>
                <button
                  className={`btn btn-ghost ${soundEnabled ? "btn-sound-on" : ""}`}
                  onClick={enableSound}
                >
                  {soundEnabled ? "🔊 Sound on" : "🔇 Sound off"}
                </button>
              </div>
            </div>

            {room.status === "playing" && (
              <>
                <div className="round-track">
                  <div
                    className="round-fill"
                    style={{ width:`${((room.roundNumber || 1) / (room.totalRounds || TOTAL_ROUNDS)) * 100}%` }}
                  />
                </div>
                <div style={{ display:"flex",justifyContent:"space-between",marginTop:8 }}>
                  <span style={{ fontSize:11,color:"var(--muted)" }}>
                    Round {room.roundNumber || 1} of {room.totalRounds || TOTAL_ROUNDS}
                  </span>
                  <span style={{ fontSize:11,color:"var(--muted)" }}>
                    {((room.roundNumber || 1) - 1)} done
                  </span>
                </div>
              </>
            )}
          </div>

          {/* ── LOBBY ── */}
          {room.status !== "playing" && room.status !== "ended" && (
            <div className="card-elevated lobby-wrap">
              <div className="lobby-title">Waiting Room</div>
              <div className="lobby-sub">Enter your name, then join the game.</div>

              <input
                className="join-input"
                placeholder="Your name…"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && joinRoom()}
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
                {players.length} player{players.length !== 1 ? "s" : ""} in lobby
              </div>
            </div>
          )}

          {/* ── PLAYING ── */}
          {room.status === "playing" && room.currentQuestion && (
            <div className="card-elevated" style={{ animation:"fadeUp 0.35s ease" }}>
              {/* Top row: question type + timer */}
              <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16 }}>
                <div className="q-type-badge">
                  {room.currentQuestion.type === "flag" ? "🌍 Flag" : "🏷️ Logo"}
                </div>

                <div className="timer-wrap">
                  <div className="timer-ring-wrap" style={{
                    animation: timerPct < 25 ? "timer-warn 0.5s ease infinite" : "none"
                  }}>
                    <svg width="68" height="68" viewBox="0 0 68 68">
                      <circle cx="34" cy="34" r="28" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="5" />
                      <circle
                        cx="34" cy="34" r="28" fill="none"
                        stroke={timerColor} strokeWidth="5" strokeLinecap="round"
                        strokeDasharray={circumference} strokeDashoffset={dashOffset}
                        style={{ transition:"stroke-dashoffset 0.3s linear,stroke 0.3s",filter:`drop-shadow(0 0 6px ${timerGlow})` }}
                      />
                    </svg>
                    <div className="timer-number" style={{ color:timerColor }}>{timeLeft}</div>
                  </div>
                </div>
              </div>

              {/* Reveal overlay */}
              {isReveal && (
                <div className="reveal-box">
                  <div className="reveal-label">Correct answer</div>
                  <div className="reveal-answer">{room.currentQuestion.answer}</div>
                  {correctPlayers.length > 0 && (
                    <div className="correct-chips">
                      {correctPlayers.map((pName) => (
                        <span key={pName} className="correct-chip">✓ {pName}</span>
                      ))}
                    </div>
                  )}
                  <div className="reveal-next">Next question in {timeLeft}s…</div>
                </div>
              )}

              {/* Image */}
              <div className="img-box" key={room.questionIndex}>
                <img src={room.currentQuestion.imageUrl} alt="Guess this" />
              </div>

              {/* Answer input */}
              <div className="answer-row">
                <input
                  className={`answer-input ${alreadyAnswered ? "answered" : ""}`}
                  placeholder={alreadyAnswered ? "✓ Answered correctly!" : "Type your answer…"}
                  value={answer}
                  onChange={(e) => { setAnswer(e.target.value); setFeedback(null); }}
                  onKeyDown={(e) => e.key === "Enter" && !alreadyAnswered && !isReveal && submitAnswer()}
                  disabled={isReveal || timeLeft === 0 || !!alreadyAnswered}
                  autoFocus
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
                <div className={feedback.ok ? "feedback-ok" : "feedback-err"}>
                  {feedback.text}
                </div>
              )}
            </div>
          )}

          {/* ── GAME OVER ── */}
          {room.status === "ended" && (
            <div className="card-elevated gameover-wrap">
              <span className="gameover-trophy">🏆</span>
              <div className="gameover-title">Game Over!</div>
              <div className="gameover-winner">
                {sortedPlayers[0]?.name} wins with {sortedPlayers[0]?.score} pts
              </div>

              {/* Podium */}
              <div className="podium">
                {/* 2nd */}
                {sortedPlayers[1] && (
                  <div className="podium-col">
                    <div className="podium-name">{sortedPlayers[1].name}</div>
                    <div className="podium-score">{sortedPlayers[1].score}</div>
                    <div className="podium-block p2">🥈</div>
                  </div>
                )}
                {/* 1st */}
                {sortedPlayers[0] && (
                  <div className="podium-col">
                    <div className="podium-name">{sortedPlayers[0].name}</div>
                    <div className="podium-score">{sortedPlayers[0].score}</div>
                    <div className="podium-block p1">🥇</div>
                  </div>
                )}
                {/* 3rd */}
                {sortedPlayers[2] && (
                  <div className="podium-col">
                    <div className="podium-name">{sortedPlayers[2].name}</div>
                    <div className="podium-score">{sortedPlayers[2].score}</div>
                    <div className="podium-block p3">🥉</div>
                  </div>
                )}
              </div>

              {/* Rest of players */}
              {sortedPlayers.slice(3).map((p, i) => (
                <div key={p.name} style={{ fontSize:13,color:"var(--muted)",marginBottom:4 }}>
                  #{i + 4} {p.name} — {p.score} pts
                </div>
              ))}

              {isHost && (
                <button
                  className="btn btn-green"
                  onClick={startGame}
                  style={{ margin:"24px auto 0",display:"block",padding:"12px 32px",fontSize:15 }}
                >
                  ▶ Play Again
                </button>
              )}
            </div>
          )}
        </div>

        {/* ── SIDEBAR — Leaderboard ── */}
        <div className="sidebar">
          <div className="card">
            <div className="sidebar-title">Leaderboard</div>
            {sortedPlayers.length === 0 && (
              <div style={{ color:"var(--muted)",fontSize:13,textAlign:"center",padding:"20px 0" }}>
                No players yet
              </div>
            )}
            {sortedPlayers.map((player, index) => (
              <div
                key={player.name}
                className={`player-row ${justScored[player.name] ? "scoring" : ""}`}
              >
                {scorePopups[player.name] && (
                  <span className="score-popup">+{scorePopups[player.name]}</span>
                )}
                {index < 3 ? (
                  <span className="player-medal">
                    {["🥇","🥈","🥉"][index]}
                  </span>
                ) : (
                  <span className="player-rank-num">#{index + 1}</span>
                )}
                <span className="player-name">{player.name}</span>
                <span className="player-score">
                  {displayScores[player.name] ?? player.score}
                </span>
              </div>
            ))}
          </div>

          {/* Points guide */}
          <div className="card" style={{ fontSize:12,color:"var(--muted)" }}>
            <div style={{ fontFamily:"'Syne',sans-serif",fontSize:11,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.12em",marginBottom:12 }}>
              Points Guide
            </div>
            <div style={{ display:"flex",flexDirection:"column",gap:8 }}>
              {[
                { label:"Lightning fast", sub:"11–15s left", pts:3, color:"var(--accent2)" },
                { label:"Quick", sub:"6–10s left", pts:2, color:"var(--accent)" },
                { label:"Just in time", sub:"1–5s left", pts:1, color:"var(--muted)" },
              ].map((row) => (
                <div key={row.label} style={{ display:"flex",alignItems:"center",justifyContent:"space-between" }}>
                  <div>
                    <div style={{ fontSize:12,fontWeight:500,color:"var(--text)" }}>{row.label}</div>
                    <div style={{ fontSize:11 }}>{row.sub}</div>
                  </div>
                  <div style={{ fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:15,color:row.color }}>
                    +{row.pts}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
