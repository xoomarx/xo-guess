"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ref, set } from "firebase/database";
import { signInAnonymously } from "firebase/auth";
import { auth, db } from "../lib/firebase";

function createRoomCode() {
  return Math.random().toString(36).substring(2, 7).toUpperCase();
}

export default function Home() {
  const router = useRouter();
  const [name, setName] = useState("");

  async function createRoom() {
    if (!name.trim()) {
      alert("Enter your name");
      return;
    }

    const user = await signInAnonymously(auth);
    const roomCode = createRoomCode();

    await set(ref(db, `rooms/${roomCode}`), {
      hostId: user.user.uid,
      players: {
        [user.user.uid]: {
          name,
          score: 0,
        },
      },
    });

    localStorage.setItem("name", name);

    router.push(`/room/${roomCode}`);
  }

  return (
    <main style={{ padding: 40, color: "white", background: "#0f172a", height: "100vh" }}>
      <h1 style={{ fontSize: 40 }}>Logo & Flag Game</h1>

      <input
        placeholder="Your name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        style={{ padding: 10, marginTop: 20 }}
      />

      <br /><br />

      <button onClick={createRoom} style={{ padding: 10 }}>
        Create Game
      </button>
    </main>
  );
}