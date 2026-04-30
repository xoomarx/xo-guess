"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { onValue, ref, update } from "firebase/database";
import { signInAnonymously } from "firebase/auth";
import { auth, db } from "../../../lib/firebase";
import { QUESTIONS } from "../../../lib/questions";

type Player = {
  name: string;
  score: number;
};

type Question = {
  type: string;
  imageUrl: string;
  answer: string;
};

type Room = {
  hostId: string;
  status?: "lobby" | "playing";
  currentQuestion?: Question;
  questionIndex?: number;
  players?: Record<string, Player>;
};

export default function RoomPage() {
  const params = useParams();
  const roomCode = params.roomCode as string;

  const [room, setRoom] = useState<Room | null | undefined>(undefined);
  const [uid, setUid] = useState("");
  const [name, setName] = useState("");
  const [answer, setAnswer] = useState("");

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
    await update(ref(db, `rooms/${roomCode}`), {
      status: "playing",
      questionIndex: 0,
      currentQuestion: QUESTIONS[0],
    });
  }

  async function nextQuestion() {
    const currentIndex = room?.questionIndex || 0;
    const nextIndex = (currentIndex + 1) % QUESTIONS.length;

    await update(ref(db, `rooms/${roomCode}`), {
      questionIndex: nextIndex,
      currentQuestion: QUESTIONS[nextIndex],
    });

    setAnswer("");
  }

  async function submitAnswer() {
    if (!room?.currentQuestion) return;
    if (!uid) return;

    const correct =
      answer.trim().toLowerCase() === room.currentQuestion.answer.toLowerCase();

    if (!correct) {
      alert("Wrong answer");
      return;
    }

    const currentScore = room.players?.[uid]?.score || 0;

    await update(ref(db, `rooms/${roomCode}/players/${uid}`), {
      score: currentScore + 1,
    });

    alert("Correct! +1 point");
    setAnswer("");
  }

  if (room === undefined) {
    return (
      <main
        style={{
          padding: 40,
          color: "white",
          background: "#0f172a",
          height: "100vh",
        }}
      >
        <h1>Loading room...</h1>
      </main>
    );
  }

  if (room === null) {
    return (
      <main
        style={{
          padding: 40,
          color: "white",
          background: "#0f172a",
          height: "100vh",
        }}
      >
        <h1>Room not found</h1>
      </main>
    );
  }

  const players = Object.values(room.players || {});
  const isHost = uid === room.hostId;

  return (
    <main
      style={{
        padding: 40,
        color: "white",
        background: "#0f172a",
        minHeight: "100vh",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <h1>Room: {roomCode}</h1>

      <p>Share this link with your friends:</p>
      <p>{typeof window !== "undefined" ? window.location.href : ""}</p>

      <hr style={{ margin: "20px 0" }} />

      {room.status !== "playing" && (
        <>
          <h2>Join Room</h2>

          <input
            placeholder="Your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={{ padding: 10 }}
          />

          <button onClick={joinRoom} style={{ padding: 10, marginLeft: 10 }}>
            Join
          </button>

          <br />
          <br />

          {isHost && (
            <button
              onClick={startGame}
              style={{
                padding: 12,
                fontWeight: "bold",
                cursor: "pointer",
              }}
            >
              Start Game
            </button>
          )}
        </>
      )}

      {room.status === "playing" && room.currentQuestion && (
        <>
          <h2>Guess this {room.currentQuestion.type}</h2>

          <div
            style={{
              background: "white",
              padding: 30,
              width: 300,
              marginTop: 20,
              borderRadius: 12,
            }}
          >
            <img
              src={room.currentQuestion.imageUrl}
              alt="Guess"
              style={{ width: "100%" }}
            />
          </div>

          <div style={{ marginTop: 20 }}>
            <input
              placeholder="Your answer"
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              style={{ padding: 10 }}
            />

            <button
              onClick={submitAnswer}
              style={{ padding: 10, marginLeft: 10 }}
            >
              Submit
            </button>
          </div>

          {isHost && (
            <button
              onClick={nextQuestion}
              style={{
                padding: 12,
                marginTop: 20,
                fontWeight: "bold",
                cursor: "pointer",
              }}
            >
              Next Question
            </button>
          )}
        </>
      )}

      <h2 style={{ marginTop: 30 }}>Players</h2>

      {players.map((player, index) => (
        <p key={index}>
          {player.name} — {player.score} pts
        </p>
      ))}
    </main>
  );
}