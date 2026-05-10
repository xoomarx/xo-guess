"use client";
export default function PrivacyPage() {
  return (
    <>
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;900&family=DM+Sans:wght@400;500;700&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        body{background:#03050f;color:#eef2ff;font-family:'DM Sans',sans-serif;min-height:100vh}
        .policy-root{max-width:760px;margin:0 auto;padding:60px 24px 100px}
        .back-link{display:inline-flex;align-items:center;gap:6px;color:#6b7fa8;font-size:13px;font-weight:700;text-decoration:none;margin-bottom:40px;transition:color .15s}
        .back-link:hover{color:#eef2ff}
        h1{font-family:'Syne',sans-serif;font-size:clamp(32px,5vw,52px);font-weight:900;line-height:1;margin-bottom:10px;background:linear-gradient(130deg,#38d9ff,#a78bfa);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
        .last-updated{font-size:12px;color:#6b7fa8;margin-bottom:48px}
        h2{font-family:'Syne',sans-serif;font-size:20px;font-weight:800;color:#eef2ff;margin:40px 0 12px;border-left:3px solid #38d9ff;padding-left:14px}
        p,li{font-size:15px;color:#a8b4cc;line-height:1.9;margin-bottom:10px}
        ul{padding-left:20px;margin-bottom:10px}
        a{color:#38d9ff;text-decoration:none}
        a:hover{text-decoration:underline}
        .highlight-box{background:rgba(56,217,255,0.07);border:1px solid rgba(56,217,255,0.18);border-radius:14px;padding:18px 22px;margin:20px 0}
      `}</style>
      <div className="policy-root">
        <a href="/" className="back-link">← Back to XO Guess</a>
        <h1>Privacy Policy</h1>
        <div className="last-updated">Last updated: May 2025</div>

        <div className="highlight-box">
          <p><strong style={{color:"#eef2ff"}}>Short version:</strong> We collect minimal data, we don&apos;t sell anything, and you can play without creating an account.</p>
        </div>

        <h2>Who We Are</h2>
        <p>XO Guess (<strong>xo-guess.vercel.app</strong>) is a free multiplayer party game platform. We provide real-time browser-based games with no download required.</p>

        <h2>What Data We Collect</h2>
        <ul>
          <li><strong>Player name:</strong> The display name you enter when creating or joining a room. This is stored temporarily in our game database while a room is active.</li>
          <li><strong>Game scores and stats:</strong> If you play a game, your score, wins, and streak data may be saved to a global leaderboard under your anonymous user ID.</li>
          <li><strong>Anonymous user ID:</strong> We use Firebase Authentication to assign you an anonymous ID. This requires no personal information — no email, no password.</li>
          <li><strong>Google account (optional):</strong> If you choose to sign in with Google, we receive your Google display name and profile picture. We do not store your email address or any other Google account details.</li>
          <li><strong>Usage analytics:</strong> If Google Analytics is enabled, we collect anonymous page view data (pages visited, time on site, device type). No personally identifiable information is collected.</li>
        </ul>

        <h2>How We Use Your Data</h2>
        <ul>
          <li>To display your name and score in the game room you joined</li>
          <li>To maintain your position on the global leaderboard</li>
          <li>To improve the game experience using anonymous analytics</li>
        </ul>
        <p>We do <strong>not</strong> use your data for advertising, profiling, or sell it to any third party.</p>

        <h2>Data Storage</h2>
        <p>Game room data is stored in <strong>Firebase Realtime Database</strong> (Google Cloud). Rooms are temporary and may be cleaned up periodically. Analytics data is processed by Google Analytics. Both services are subject to their respective privacy policies.</p>

        <h2>Cookies &amp; Local Storage</h2>
        <p>We use <strong>localStorage</strong> (not cookies) to remember your display name and avatar between sessions. No tracking cookies are set by our application. Google Analytics may set its own cookies as described in <a href="https://policies.google.com/privacy" target="_blank" rel="noopener">Google&apos;s Privacy Policy</a>.</p>

        <h2>Children&apos;s Privacy</h2>
        <p>XO Guess is intended for general audiences. We do not knowingly collect personal information from children under 13. If you believe a child has provided personal information, please contact us and we will delete it.</p>

        <h2>Your Rights</h2>
        <p>Since we only store anonymous IDs and optional display names, there is no personally identifiable information to request or delete. You can clear your localStorage data at any time by clearing your browser&apos;s site data.</p>

        <h2>Changes to This Policy</h2>
        <p>We may update this policy occasionally. The "Last updated" date at the top will reflect any changes. Continued use of the site after changes constitutes acceptance.</p>

        <h2>Contact</h2>
        <p>Questions about this privacy policy? Reach out via the GitHub repository or the contact information listed on our platform.</p>
      </div>
    </>
  );
}
