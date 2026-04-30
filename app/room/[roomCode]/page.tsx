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
  roundAnswers?: Record<string, Record<string, boolean>>;
  players?: Record<string, Player>;
};

export default function RoomPage() {
  const params = useParams();
  const roomCode = params.roomCode as string;

  const [room, setRoom] = useState<Room | null | undefined>(undefined);
  const [uid, setUid] = useState("");
  const [name, setName] = useState("");
  const [answer, setAnswer] = useState("");
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
    if (room?.status !== "playing" || !room.roundStartedAt) return;

    const interval = setInterval(() => {
      const serverNow = Date.now() + serverOffset;
      const elapsed = Math.floor((serverNow - room.roundStartedAt!) / 1000);
      const remaining = Math.max(TIMER_SECONDS - elapsed, 0);

      setTimeLeft(remaining);
    }, 300);

    return () => clearInterval(interval);
  }, [room?.status, room?.roundStartedAt, serverOffset]);

  useEffect(() => {
    if (!isHost) return;
    if (room?.status !== "playing") return;
    if (timeLeft !== 0) return;

    const timeout = setTimeout(() => {
      nextQuestion();
    }, 2500);

    return () => clearTimeout(timeout);
  }, [timeLeft, isHost, room?.status, room?.questionIndex]);

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
    });

    setAnswer("");
  }

  async function submitAnswer() {
    if (!room?.currentQuestion) return;
    if (!uid) return;

    if (timeLeft <= 0) {
      alert("Time is up!");
      return;
    }

    const questionKey = String(room.questionIndex);
    const alreadyAnswered = room.roundAnswers?.[questionKey]?.[uid];

    if (alreadyAnswered) {
      alert("You already answered this round.");
      return;
    }

    const correct = isCorrectAnswer(answer, room.currentQuestion);

    if (!correct) {
      alert("Wrong answer");
      await update(ref(db, `rooms/${roomCode}/roundAnswers/${questionKey}`), {
        [uid]: true,
      });
      return;
    }

    const currentScore = room.players?.[uid]?.score || 0;

    await update(ref(db, `rooms/${roomCode}`), {
      [`players/${uid}/score`]: currentScore + 1,
      [`roundAnswers/${questionKey}/${uid}`]: true,
    });

    alert("Correct! +1 point");
    setAnswer("");
  }

  if (room === undefined) {
    return (
      <main style={styles.page}>
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
  const alreadyAnswered = uid ? room.roundAnswers?.[questionKey]?.[uid] : false;

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
                <h2>Round {room.roundNumber || 1} / {room.totalRounds || TOTAL_ROUNDS}</h2>
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

            {timeLeft === 0 && (
              <h2 style={{ color: "#38bdf8" }}>
                Answer: {room.currentQuestion.answer}
              </h2>
            )}

            <input
              placeholder={alreadyAnswered ? "Already answered" : "Type your answer"}
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              disabled={timeLeft === 0 || !!alreadyAnswered}
              style={styles.input}
            />

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
              <div key={index} style={styles.player}>
                <span>
                  #{index + 1} {player.name}
                </span>
                <strong>{player.score} pts</strong>
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
  player: {
    display: "flex",
    justifyContent: "space-between",
    background: "#1e293b",
    border: "1px solid #334155",
    borderRadius: 14,
    padding: 14,
    marginTop: 10,
  },
};