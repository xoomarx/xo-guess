"use client";

import { useEffect, useState } from "react";
import { ref, onValue } from "firebase/database";
import { db } from "../../lib/firebase";

type UserStat = {
  name: string;
  totalScore: number;
  gamesPlayed: number;
  wins: number;
  bestScore: number;
  bestStreak?: number;
  lastSeen?: number;
};

export default function LeaderboardPage() {
  const [players, setPlayers] = useState<{ uid: string; stat: UserStat }[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"total" | "best" | "wins">("total");

  useEffect(() => {
    const usersRef = ref(db, "users");
    const unsub = onValue(usersRef, (snapshot) => {
      setLoading(false);
      if (!snapshot.exists()) { setPlayers([]); return; }
      const data = snapshot.val() as Record<string, UserStat>;
      const list = Object.entries(data)
        .map(([uid, stat]) => ({ uid, stat }))
        .filter((p) => p.stat.gamesPlayed > 0);
      setPlayers(list);
    });
    return () => unsub();
  }, []);

  const sorted = [...players].sort((a, b) => {
    if (tab === "total") return b.stat.totalScore - a.stat.totalScore;
    if (tab === "best") return b.stat.bestScore - a.stat.bestScore;
    return b.stat.wins - a.stat.wins;
  }).slice(0, 100);

  const MEDALS = ["🥇", "🥈", "🥉"];

  return (
    <>
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800;900&family=DM+Sans:wght@400;500;700&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        body{background:#03050f;color:#eef2ff;font-family:'DM Sans',sans-serif;min-height:100vh}
        @keyframes fadeUp{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:translateY(0)}}
        .lb-root{max-width:800px;margin:0 auto;padding:60px 20px 100px}
        .back-link{display:inline-flex;align-items:center;gap:6px;color:#6b7fa8;font-size:13px;font-weight:700;text-decoration:none;margin-bottom:36px;transition:color .15s}
        .back-link:hover{color:#eef2ff}
        .lb-header{margin-bottom:32px}
        h1{font-family:'Syne',sans-serif;font-size:clamp(36px,5vw,58px);font-weight:900;line-height:1;margin-bottom:8px;background:linear-gradient(130deg,#facc15,#f59e0b);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
        .lb-sub{color:#6b7fa8;font-size:14px}
        .tabs{display:grid;grid-template-columns:repeat(3,1fr);gap:4px;padding:4px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:14px;margin-bottom:24px}
        .tab-btn{padding:10px;border-radius:10px;border:none;font-family:'DM Sans',sans-serif;font-size:13px;font-weight:700;cursor:pointer;color:#6b7fa8;background:transparent;transition:all .2s}
        .tab-btn.active{background:linear-gradient(135deg,rgba(250,204,21,0.16),rgba(245,158,11,0.12));color:#eef2ff;border:1px solid rgba(255,255,255,0.10)}
        .tab-btn:hover:not(.active){color:#eef2ff}
        .lb-table{display:flex;flex-direction:column;gap:6px}
        .lb-row{
          display:grid;grid-template-columns:44px 1fr auto auto auto;align-items:center;gap:12px;
          padding:14px 16px;border-radius:14px;
          background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.07);
          animation:fadeUp 0.4s ease both;
          transition:background .15s,border-color .15s;
        }
        .lb-row:hover{background:rgba(255,255,255,0.07);border-color:rgba(255,255,255,0.12)}
        .lb-row.top1{background:rgba(240,192,64,0.08);border-color:rgba(240,192,64,0.28)}
        .lb-row.top2{background:rgba(192,192,210,0.06);border-color:rgba(192,192,210,0.22)}
        .lb-row.top3{background:rgba(200,128,96,0.06);border-color:rgba(200,128,96,0.22)}
        .lb-rank{font-family:'Syne',sans-serif;font-size:15px;font-weight:900;color:#6b7fa8;text-align:center}
        .lb-name{font-weight:700;font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .lb-stat{font-family:'Syne',sans-serif;font-size:13px;font-weight:800;color:#38d9ff;white-space:nowrap}
        .lb-meta{font-size:11px;color:#6b7fa8;white-space:nowrap}
        .lb-meta span{display:inline-block;margin-left:8px}
        .lb-games{font-size:11px;color:#6b7fa8;white-space:nowrap}
        .empty-state{text-align:center;padding:80px 20px;color:#6b7fa8;font-size:15px}
        .loading-row{padding:40px;text-align:center;color:#6b7fa8;font-size:14px}
        @media(max-width:600px){
          .lb-row{grid-template-columns:36px 1fr auto}
          .lb-meta,.lb-games{display:none}
        }
      `}</style>

      <div className="lb-root">
        <a href="/" className="back-link">← Back to XO Guess</a>
        <div className="lb-header">
          <h1>🏆 Leaderboard</h1>
          <div className="lb-sub">Top 100 players across all game modes · Updates live</div>
        </div>

        <div className="tabs">
          <button className={`tab-btn${tab === "total" ? " active" : ""}`} onClick={() => setTab("total")}>
            💯 Total Score
          </button>
          <button className={`tab-btn${tab === "best" ? " active" : ""}`} onClick={() => setTab("best")}>
            ⚡ Best Game
          </button>
          <button className={`tab-btn${tab === "wins" ? " active" : ""}`} onClick={() => setTab("wins")}>
            🥇 Most Wins
          </button>
        </div>

        {loading ? (
          <div className="loading-row">Loading leaderboard…</div>
        ) : sorted.length === 0 ? (
          <div className="empty-state">
            <div style={{ fontSize: 48, marginBottom: 16 }}>🎮</div>
            <div>No games played yet. Be the first on the board!</div>
            <div style={{ marginTop: 12 }}>
              <a href="/" style={{ color: "#38d9ff" }}>Play now →</a>
            </div>
          </div>
        ) : (
          <div className="lb-table">
            {sorted.map((p, i) => (
              <div
                key={p.uid}
                className={`lb-row${i === 0 ? " top1" : i === 1 ? " top2" : i === 2 ? " top3" : ""}`}
                style={{ animationDelay: `${Math.min(i * 0.04, 0.5)}s` }}
              >
                <div className="lb-rank">
                  {i < 3 ? MEDALS[i] : `#${i + 1}`}
                </div>
                <div className="lb-name">{p.stat.name || "Anonymous"}</div>
                <div className="lb-stat">
                  {tab === "total"
                    ? `${p.stat.totalScore.toLocaleString()} pts`
                    : tab === "best"
                    ? `${p.stat.bestScore.toLocaleString()} pts`
                    : `${p.stat.wins} W`}
                </div>
                <div className="lb-meta">
                  <span>🎮 {p.stat.gamesPlayed} games</span>
                  {p.stat.bestStreak ? <span>🔥 {p.stat.bestStreak} streak</span> : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
