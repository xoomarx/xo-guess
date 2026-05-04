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
  const [loading, setLoading] = useState(false);

  async function createRoom() {
    if (!name.trim()) return;
    setLoading(true);

    let user;
    if (auth.currentUser) {
      user = { user: auth.currentUser };
    } else {
      user = await signInAnonymously(auth);
    }

    const roomCode = createRoomCode();

    await set(ref(db, `rooms/${roomCode}`), {
      hostId: user.user.uid,
      status: "lobby",
      questionIndex: 0,
      players: {
        [user.user.uid]: { name: name.trim(), score: 0 },
      },
    });

    localStorage.setItem("name", name.trim());
    router.push(`/room/${roomCode}`);
  }

  return (
    <>
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@300;400;500&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        :root {
          --bg: #080c14;
          --surface: #0e1521;
          --border: rgba(255,255,255,0.07);
          --accent: #f0c040;
          --accent2: #4af0a0;
          --text: #e8edf5;
          --muted: #5a6a80;
        }

        body {
          background: var(--bg);
          color: var(--text);
          font-family: 'DM Sans', sans-serif;
          min-height: 100vh;
          overflow-x: hidden;
        }

        @keyframes grain {
          0%, 100% { transform: translate(0, 0); }
          10% { transform: translate(-2%, -3%); }
          20% { transform: translate(3%, 2%); }
          30% { transform: translate(-1%, 4%); }
          40% { transform: translate(4%, -1%); }
          50% { transform: translate(-3%, 3%); }
          60% { transform: translate(2%, -4%); }
          70% { transform: translate(-4%, 1%); }
          80% { transform: translate(3%, -2%); }
          90% { transform: translate(-2%, 4%); }
        }

        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-12px); }
        }

        @keyframes pulse-ring {
          0% { transform: scale(1); opacity: 0.6; }
          100% { transform: scale(1.6); opacity: 0; }
        }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(24px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes shimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }

        .noise::after {
          content: '';
          position: fixed;
          inset: -50%;
          width: 200%;
          height: 200%;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E");
          opacity: 0.025;
          pointer-events: none;
          z-index: 999;
          animation: grain 8s steps(10) infinite;
        }

        .hero-glow {
          position: absolute;
          top: -200px;
          left: 50%;
          transform: translateX(-50%);
          width: 700px;
          height: 700px;
          background: radial-gradient(ellipse, rgba(240,192,64,0.08) 0%, transparent 70%);
          pointer-events: none;
        }

        .card {
          animation: fadeUp 0.6s ease both;
        }

        .badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: rgba(240,192,64,0.1);
          border: 1px solid rgba(240,192,64,0.25);
          color: var(--accent);
          font-size: 11px;
          font-weight: 500;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          padding: 6px 14px;
          border-radius: 100px;
          margin-bottom: 24px;
          animation: fadeUp 0.4s ease both;
        }

        .badge-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--accent);
          position: relative;
        }

        .badge-dot::after {
          content: '';
          position: absolute;
          inset: -3px;
          border-radius: 50%;
          background: var(--accent);
          animation: pulse-ring 1.5s ease-out infinite;
        }

        h1.title {
          font-family: 'Syne', sans-serif;
          font-size: clamp(48px, 8vw, 88px);
          font-weight: 800;
          line-height: 0.95;
          letter-spacing: -0.03em;
          margin-bottom: 20px;
          animation: fadeUp 0.5s ease both;
          animation-delay: 0.05s;
        }

        .title-line2 {
          background: linear-gradient(90deg, var(--accent), var(--accent2), var(--accent));
          background-size: 200% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: shimmer 3s linear infinite, fadeUp 0.5s ease both;
          animation-delay: 0s, 0.1s;
        }

        .subtitle {
          font-size: 16px;
          color: var(--muted);
          line-height: 1.7;
          max-width: 340px;
          margin-bottom: 40px;
          font-weight: 300;
          animation: fadeUp 0.5s ease both;
          animation-delay: 0.15s;
        }

        .input-wrap {
          position: relative;
          animation: fadeUp 0.5s ease both;
          animation-delay: 0.2s;
        }

        .input-wrap input {
          width: 100%;
          background: var(--surface);
          border: 1px solid var(--border);
          color: var(--text);
          font-family: 'DM Sans', sans-serif;
          font-size: 15px;
          padding: 16px 20px;
          border-radius: 14px;
          outline: none;
          transition: border-color 0.2s, box-shadow 0.2s;
        }

        .input-wrap input:focus {
          border-color: rgba(240,192,64,0.4);
          box-shadow: 0 0 0 3px rgba(240,192,64,0.08);
        }

        .input-wrap input::placeholder { color: var(--muted); }

        .cta-btn {
          width: 100%;
          margin-top: 12px;
          padding: 16px 24px;
          border-radius: 14px;
          border: none;
          background: var(--accent);
          color: #080c14;
          font-family: 'Syne', sans-serif;
          font-size: 16px;
          font-weight: 700;
          letter-spacing: 0.02em;
          cursor: pointer;
          transition: transform 0.15s, box-shadow 0.15s, opacity 0.15s;
          box-shadow: 0 4px 32px rgba(240,192,64,0.25);
          animation: fadeUp 0.5s ease both;
          animation-delay: 0.25s;
        }

        .cta-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 8px 40px rgba(240,192,64,0.35);
        }

        .cta-btn:active:not(:disabled) { transform: translateY(0); }
        .cta-btn:disabled { opacity: 0.5; cursor: not-allowed; }

        .features {
          display: flex;
          gap: 20px;
          margin-top: 48px;
          animation: fadeUp 0.5s ease both;
          animation-delay: 0.3s;
        }

        .feature {
          flex: 1;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 16px;
          padding: 20px;
        }

        .feature-icon {
          font-size: 24px;
          margin-bottom: 10px;
        }

        .feature-title {
          font-family: 'Syne', sans-serif;
          font-size: 14px;
          font-weight: 700;
          margin-bottom: 4px;
        }

        .feature-desc {
          font-size: 12px;
          color: var(--muted);
          line-height: 1.5;
        }

        .orb {
          position: absolute;
          border-radius: 50%;
          pointer-events: none;
        }

        .orb-1 {
          width: 300px; height: 300px;
          background: radial-gradient(circle, rgba(74,240,160,0.06), transparent 70%);
          bottom: -80px; right: -80px;
          animation: float 7s ease-in-out infinite;
        }

        .orb-2 {
          width: 200px; height: 200px;
          background: radial-gradient(circle, rgba(240,192,64,0.07), transparent 70%);
          top: 60px; left: -60px;
          animation: float 9s ease-in-out infinite reverse;
        }
      `}</style>

      <div className="noise" />

      <main style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 20px',
        position: 'relative',
      }}>
        <div className="hero-glow" />

        <div className="card" style={{
          width: '100%',
          maxWidth: 460,
          position: 'relative',
        }}>
          <div className="orb-1 orb" />
          <div className="orb-2 orb" />

          <div className="badge">
            <span className="badge-dot" />
            Multiplayer · Live
          </div>

          <h1 className="title">
            Logo<br />
            <span className="title-line2">& Flag</span><br />
            Rush
          </h1>

          <p className="subtitle">
            Guess logos and flags faster than anyone else. Score more points for quick answers.
          </p>

          <div className="input-wrap">
            <input
              placeholder="Enter your name…"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !loading && name.trim() && createRoom()}
              maxLength={20}
            />
          </div>

          <button
            className="cta-btn"
            onClick={createRoom}
            disabled={!name.trim() || loading}
          >
            {loading ? 'Creating room…' : 'Create Game →'}
          </button>

          <div className="features">
            <div className="feature">
              <div className="feature-icon">🌍</div>
              <div className="feature-title">Flags</div>
              <div className="feature-desc">150+ countries to identify</div>
            </div>
            <div className="feature">
              <div className="feature-icon">🏷️</div>
              <div className="feature-title">Logos</div>
              <div className="feature-desc">100+ brands & icons</div>
            </div>
            <div className="feature">
              <div className="feature-icon">⚡</div>
              <div className="feature-title">Speed</div>
              <div className="feature-desc">Fast answers = more points</div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
