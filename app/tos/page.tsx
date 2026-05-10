"use client";
export default function TosPage() {
  return (
    <>
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;900&family=DM+Sans:wght@400;500;700&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        body{background:#03050f;color:#eef2ff;font-family:'DM Sans',sans-serif;min-height:100vh}
        .policy-root{max-width:760px;margin:0 auto;padding:60px 24px 100px}
        .back-link{display:inline-flex;align-items:center;gap:6px;color:#6b7fa8;font-size:13px;font-weight:700;text-decoration:none;margin-bottom:40px;transition:color .15s}
        .back-link:hover{color:#eef2ff}
        h1{font-family:'Syne',sans-serif;font-size:clamp(32px,5vw,52px);font-weight:900;line-height:1;margin-bottom:10px;background:linear-gradient(130deg,#a78bfa,#f472b6);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
        .last-updated{font-size:12px;color:#6b7fa8;margin-bottom:48px}
        h2{font-family:'Syne',sans-serif;font-size:20px;font-weight:800;color:#eef2ff;margin:40px 0 12px;border-left:3px solid #a78bfa;padding-left:14px}
        p,li{font-size:15px;color:#a8b4cc;line-height:1.9;margin-bottom:10px}
        ul{padding-left:20px;margin-bottom:10px}
        a{color:#a78bfa;text-decoration:none}
        a:hover{text-decoration:underline}
      `}</style>
      <div className="policy-root">
        <a href="/" className="back-link">← Back to XO Guess</a>
        <h1>Terms of Service</h1>
        <div className="last-updated">Last updated: May 2025</div>

        <h2>Acceptance of Terms</h2>
        <p>By accessing or using XO Guess (<strong>xo-guess.vercel.app</strong>), you agree to these Terms of Service. If you do not agree, please do not use the platform.</p>

        <h2>Description of Service</h2>
        <p>XO Guess is a free, browser-based multiplayer party game platform. Players can create game rooms, invite friends, and compete across multiple game modes in real time. The service is provided free of charge with no guarantee of continued availability.</p>

        <h2>Acceptable Use</h2>
        <p>You agree to use XO Guess only for lawful purposes. You must not:</p>
        <ul>
          <li>Use offensive, hateful, or inappropriate player names</li>
          <li>Attempt to hack, exploit, or disrupt the game or its infrastructure</li>
          <li>Use automated scripts or bots to gain unfair advantages</li>
          <li>Impersonate other players or attempt to access rooms you are not invited to</li>
          <li>Engage in any activity that violates applicable laws</li>
        </ul>

        <h2>User Content</h2>
        <p>By entering a display name and participating in game rooms, you grant us a non-exclusive, royalty-free license to display that content within the platform (e.g., on leaderboards). You are responsible for any content you submit.</p>

        <h2>Intellectual Property</h2>
        <p>All game content, design, code, and branding on XO Guess are the property of the platform owner. You may not reproduce, distribute, or create derivative works without explicit written permission.</p>

        <h2>Third-Party Services</h2>
        <p>XO Guess uses Firebase (Google) for real-time data storage and authentication, and optionally Google Analytics for usage measurement. Your use of the platform is also subject to <a href="https://firebase.google.com/terms" target="_blank" rel="noopener">Firebase&apos;s Terms of Service</a> and <a href="https://policies.google.com/terms" target="_blank" rel="noopener">Google&apos;s Terms of Service</a>.</p>

        <h2>Disclaimers</h2>
        <p>XO Guess is provided &quot;as is&quot; without warranties of any kind. We do not guarantee that the service will be available at all times, error-free, or suitable for any particular purpose. We are not liable for any loss or damage arising from your use of the platform.</p>

        <h2>Modifications</h2>
        <p>We reserve the right to modify or discontinue the service at any time without notice. We may also update these Terms of Service. Continued use of the platform after changes constitutes acceptance of the new terms.</p>

        <h2>Governing Law</h2>
        <p>These terms are governed by the laws of the jurisdiction in which the platform owner operates. Any disputes shall be resolved in that jurisdiction.</p>

        <h2>Contact</h2>
        <p>For questions about these Terms of Service, please contact us through the platform&apos;s official channels.</p>
      </div>
    </>
  );
}
