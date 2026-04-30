"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { onValue, ref, update } from "firebase/database";
import { signInAnonymously } from "firebase/auth";
import { auth, db } from "../../../lib/firebase";

type Player = {
  name: string;
  score: number;
};

type Room = {
  hostId: string;
  players?: Record<string, Player>;
};

export default function RoomPage() {
  const params = useParams();
  const roomCode = params.roomCode as string;

  const [room, setRoom] = useState<Room | null | undefined>(undefined);
  const [uid, setUid] = useState("");
  const [name, setName] = useState("");

  useEffect(() => {
    async function login() {
      if (auth.currentUser) {
        setUid(auth.currentUser.uid);
        return;
      }

      const result = await signInAnonymously(auth);
      setUid(result.user.uid);
    }

    login();
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
    if (!uid) {
      alert("Still connecting. Try again in a second.");
      return;
    }

    if (!name.trim()) {
      alert("Enter your name");
      return;
    }

    await update(ref(db, `rooms/${roomCode}/players/${uid}`), {
      name: name.trim(),
      score: 0,
    });
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
        <p>Go back home and create a new game.</p>
      </main>
    );
  }

  const players = Object.values(room.players || {});

  return (
    <main
      style={{
        padding: 40,
        color: "white",
        background: "#0f172a",
        minHeight: "100vh",
      }}
    >
      <h1>Room: {roomCode}</h1>

      <p>Share this link with your friends:</p>
      <p>{typeof window !== "undefined" ? window.location.href : ""}</p>

      <hr style={{ margin: "20px 0" }} />

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

      <h2 style={{ marginTop: 30 }}>Players</h2>

      {players.length === 0 ? (
        <p>No players yet.</p>
      ) : (
        players.map((player, index) => (
          <p key={index}>
            {player.name} — {player.score} pts
          </p>
        ))
      )}
    </main>
  );
}