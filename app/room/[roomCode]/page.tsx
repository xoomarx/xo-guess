"use client";

import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { useParams } from "next/navigation";
import { onValue, ref, update, serverTimestamp } from "firebase/database";
import { signInAnonymously } from "firebase/auth";
import { auth, db } from "../../../lib/firebase";
import { getRandomQuestion, isCorrectAnswer } from "../../../lib/questions";

const TIMER_SECONDS = 15;
const TOTAL_ROUNDS = 10;
const REVEAL_SECONDS = 3;

type Player = {
  name: string;
  score: number;
};

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

export default function RoomPage() {
  const params = useParams();
  const roomCode = params.roomCode as string;

  const [room, setRoom] = useState<Room | null | undefined>(undefined);
  const [uid, setUid] = useState("");
  const [name, setName] = useState("");
  const [answer, setAnswer] = useState("");
const [feedback, setFeedback] = useState("");
const [prevScores, setPrevScores] = useState<Record<string, number>>({});
const [justScored, setJustScored] = useState<Record<string, boolean>>({});
const [scorePopups, setScorePopups] = useState<Record<string, number>>({});
  const [timeLeft, setTimeLeft] = useState(TIMER_SECONDS);
  const [serverOffset, setServerOffset] = useState(0);

  const isHost = Boolean(uid && room?.hostId === uid);

  useEffect(() => {
    const savedName = localStorage.getItem("name");
    if (savedName) setName(savedName);
  }, []);

  useEffect(() => {
    if (auth.currentUser) {
      setUid(auth.currentUser.uid);
    } else {
      signInAnonymously(auth).then((result) => {
        setUid(result.user.uid);
      });
    }
  }, []);
useEffect(() => {
  if (!room?.players) return;

  const newScores: Record<string, number> = {};

  Object.values(room.players).forEach((player) => {
    newScores[player.name] = player.score;
  });

  setPrevScores((prev) => {
    const hasPreviousScores = Object.keys(prev).length > 0;

    if (!hasPreviousScores) {
      return newScores;
    }

    Object.entries(newScores).forEach(([name, score]) => {
      const oldScore = prev[name] ?? 0;
      const gained = score - oldScore;

      if (gained > 0) {
        setJustScored((s) => ({ ...s, [name]: true }));
        setScorePopups((s) => ({ ...s, [name]: gained }));

        setTimeout(() => {
          setJustScored((s) => ({ ...s, [name]: false }));
          setScorePopups((s) => {
            const copy = { ...s };
            delete copy[name];
            return copy;
          });
        }, 1200);
      }
    });

    return newScores;
  });
}, [room?.players]);
  useEffect(() => {
    const roomRef = ref(db, `rooms/${roomCode}`);

    const unsubscribe = onValue(roomRef, (snapshot) => {
      if (snapshot.exists()) {
        setRoom(snapshot.val());
      } else {
        setRoom(null);
      }
    });

    return () => unsubscribe();
  }, [roomCode]);

  useEffect(() => {
    const offsetRef = ref(db, ".info/serverTimeOffset");

    const unsubscribe = onValue(offsetRef, (snapshot) => {
      setServerOffset(snapshot.val() || 0);
    });

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

      if (remaining === 0 && isHost) {
        clearInterval(interval);
        nextQuestion();
      }

      return;
    }

    if (!room.roundStartedAt) return;

    const elapsed = Math.floor((serverNow - room.roundStartedAt) / 1000);
    const remaining = Math.max(TIMER_SECONDS - elapsed, 0);

    setTimeLeft(remaining);

    if (remaining === 0 && isHost && room.phase !== "reveal") {
      clearInterval(interval);

      update(ref(db, `rooms/${roomCode}`), {
        phase: "reveal",
        revealStartedAt: serverTimestamp(),
      });
    }
  }, 300);

  return () => clearInterval(interval);
}, [
  room?.status,
  room?.roundStartedAt,
  room?.revealStartedAt,
  room?.phase,
  room?.questionIndex,
  serverOffset,
  isHost,
]);;

  async function joinRoom() {
    if (!uid) return;

    const playerName = name.trim();

    if (!playerName) {
      alert("Enter your name");
      return;
    }

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

    setAnswer("");
  }

  async function nextQuestion() {
    const currentRound = room?.roundNumber || 1;

    if (currentRound >= TOTAL_ROUNDS) {
      await update(ref(db, `rooms/${roomCode}`), {
        status: "ended",
      });
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

    setAnswer("");
  }

  async function submitAnswer() {
    if (!room?.currentQuestion) return;
if (room.phase === "reveal") return;
    if (!uid) return;

    if (timeLeft <= 0) {
      alert("Time is up!");
      return;
    }

    const questionKey = String(room.questionIndex);
    const alreadyAnswered = room.roundAnswers?.[questionKey]?.[uid]?.correct;

    if (alreadyAnswered) {
      alert("You already answered this round.");
      return;
    }

    const correct = isCorrectAnswer(answer, room.currentQuestion);

if (!correct) {
  setAnswer("");
  setFeedback("Wrong answer, try again");
  return;
}

    const currentScore = room.players?.[uid]?.score || 0;

    const serverNow = Date.now() + serverOffset;
    const elapsed = Math.floor(
      (serverNow - (room.roundStartedAt || serverNow)) / 1000
    );
    const remaining = Math.max(TIMER_SECONDS - elapsed, 0);

    const earnedPoints = remaining >= 11 ? 3 : remaining >= 6 ? 2 : 1;

    await update(ref(db, `rooms/${roomCode}`), {
      [`players/${uid}/score`]: currentScore + earnedPoints,
      [`roundAnswers/${questionKey}/${uid}`]: {
  correct: true,
},
    });
setFeedback(`✅ Correct! +${earnedPoints} pts`);

      setAnswer("");
  }

  if (room === undefined) {
    return (
      <main style={styles.page}>
<style jsx global>{`
  @keyframes floatPoints {
    0% {
      opacity: 0;
      transform: translateY(8px) scale(0.9);
    }
    20% {
      opacity: 1;
      transform: translateY(0) scale(1.1);
    }
    100% {
      opacity: 0;
      transform: translateY(-28px) scale(1);
    }
  }
`}</style>
        <h1>Loading room...</h1>
      </main>
    );
  }

  if (room === null) {
    return (
      <main style={styles.page}>
        <h1>Room not found</h1>
      </main>
    );
  }


  const players = Object.values(room.players || {});
  const questionKey = String(room.questionIndex);
  const alreadyAnswered = uid
  ? room.roundAnswers?.[questionKey]?.[uid]?.correct
  : false;
const correctPlayerIds = Object.entries(room.roundAnswers?.[questionKey] || {})
  .filter(([, result]) => result.correct)
  .map(([playerId]) => playerId);

const correctPlayers = correctPlayerIds
  .map((playerId) => room.players?.[playerId]?.name)
  .filter(Boolean);

  return (
    <main style={styles.page}>
      <section style={styles.card}>
        <h1 style={styles.title}>Logo & Flag Rush</h1>
        <p style={styles.room}>Room: {roomCode}</p>

        <button
          onClick={() => navigator.clipboard.writeText(window.location.href)}
          style={styles.secondaryButton}
        >
          Copy invite link
        </button>

        {room.status !== "playing" && room.status !== "ended" && (
          <div style={styles.section}>
            <h2>Join Room</h2>

            <input
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={styles.input}
            />

            <button onClick={joinRoom} style={styles.button}>
              Join
            </button>

            {isHost && (
              <button onClick={startGame} style={styles.startButton}>
                Start Game
              </button>
            )}
          </div>
        )}

        {room.status === "playing" && room.currentQuestion && (
          <div style={styles.section}>
            <div style={styles.topRow}>
              <div>
                <h2>
                  Round {room.roundNumber || 1} /{" "}
                  {room.totalRounds || TOTAL_ROUNDS}
                </h2>
                <p>Guess the {room.currentQuestion.type}</p>
              </div>

              <div style={styles.timer}>{timeLeft}s</div>
            </div>

            <div style={styles.imageBox}>
              <img
                src={room.currentQuestion.imageUrl}
                alt="Guess"
                style={styles.image}
              />
            </div>

            {room.phase === "reveal" && (
  <div style={styles.revealBox}>
    <p style={styles.revealLabel}>Correct answer</p>
    <h2 style={styles.revealAnswer}>{room.currentQuestion.answer}</h2>
    <p style={styles.revealNext}>Next question in {timeLeft}s</p>
  </div>
)}
            <input
              placeholder={alreadyAnswered ? "Already answered" : "Type your answer"}
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              disabled={room.phase === "reveal" || timeLeft === 0 || !!alreadyAnswered}
              style={styles.input}
            />
{feedback && (
  <p style={{ color: "#f87171", marginTop: 10 }}>{feedback}</p>
)}

            <button
              onClick={submitAnswer}
              disabled={timeLeft === 0 || !!alreadyAnswered}
              style={styles.button}
            >
              Submit
            </button>
          </div>
        )}

        {room.status === "ended" && (
          <div style={styles.section}>
            <h2>Game Over 🎉</h2>
            <p>Final leaderboard:</p>

            {isHost && (
              <button onClick={startGame} style={styles.startButton}>
                Play Again
              </button>
            )}
          </div>
        )}

        <div style={styles.section}>
          <h2>Players</h2>

          {players
            .sort((a, b) => b.score - a.score)
            .map((player, index) => (
              <div
  key={index}
  style={{
    ...styles.player,
    ...(justScored[player.name]
      ? styles.playerHighlight
      : {}),
  }}
>
                <span>
                  #{index + 1} {player.name}
                </span>
                <strong>{player.score} pts</strong>

{scorePopups[player.name] && (
  <span style={styles.pointsPopup}>+{scorePopups[player.name]}</span>
)}
              </div>
            ))}
        </div>
      </section>
    </main>
  );
}

const styles: Record<string, CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "linear-gradient(135deg, #020617, #1e293b)",
    color: "white",
    fontFamily: "Arial, sans-serif",
    padding: 24,
  },
  card: {
    maxWidth: 760,
    margin: "0 auto",
    background: "#0f172a",
    border: "1px solid #334155",
    borderRadius: 24,
    padding: 28,
    boxShadow: "0 20px 60px rgba(0,0,0,0.4)",
  },
  title: {
    fontSize: 42,
    marginBottom: 8,
  },
  room: {
    color: "#94a3b8",
  },
  section: {
    marginTop: 28,
  },
  topRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 16,
  },
  timer: {
    background: "#22d3ee",
    color: "#020617",
    fontWeight: "bold",
    fontSize: 28,
    padding: "10px 18px",
    borderRadius: 16,
  },
  imageBox: {
    background: "white",
    borderRadius: 20,
    padding: 32,
    marginTop: 20,
    marginBottom: 20,
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    minHeight: 220,
  },
  image: {
    maxWidth: "100%",
    maxHeight: 180,
    objectFit: "contain",
  },
  input: {
    padding: 12,
    borderRadius: 12,
    border: "none",
    marginRight: 10,
    marginTop: 10,
    minWidth: 220,
  },
  button: {
    padding: "12px 18px",
    borderRadius: 12,
    border: "none",
    background: "#38bdf8",
    color: "#020617",
    fontWeight: "bold",
    cursor: "pointer",
    marginTop: 10,
  },
  startButton: {
    display: "block",
    marginTop: 18,
    padding: "14px 22px",
    borderRadius: 14,
    border: "none",
    background: "#a3e635",
    color: "#020617",
    fontWeight: "bold",
    cursor: "pointer",
  },
  secondaryButton: {
    padding: "10px 14px",
    borderRadius: 12,
    border: "1px solid #475569",
    background: "#1e293b",
    color: "white",
    cursor: "pointer",
  },
revealBox: {
  background: "#082f49",
  border: "1px solid #38bdf8",
  borderRadius: 18,
  padding: 20,
  marginBottom: 18,
  textAlign: "center",
},
revealLabel: {
  color: "#bae6fd",
  margin: 0,
},
revealAnswer: {
  color: "#facc15",
  fontSize: 34,
  margin: "8px 0",
},
revealNext: {
  color: "#cbd5e1",
  margin: 0,
},
pointsPopup: {
  position: "absolute",
  right: 18,
  top: 6,
  color: "#bbf7d0",
  fontWeight: "bold",
  fontSize: 18,
  animation: "floatPoints 1.2s ease-out forwards",
  pointerEvents: "none",
},
playerHighlight: {
  background: "#064e3b",
  border: "1px solid #22c55e",
  boxShadow: "0 0 12px #22c55e",
  transition: "all 0.3s ease",
},
  player: {
position: "relative",
overflow: "hidden",
    display: "flex",
    justifyContent: "space-between",
    background: "#1e293b",
    border: "1px solid #334155",
    borderRadius: 14,
    padding: 14,
    marginTop: 10,
  },
};