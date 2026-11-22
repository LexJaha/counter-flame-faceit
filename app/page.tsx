"use client";

import { useEffect, useState } from "react";

const features = [
  ["01", "MATCHMAKING", "Find competitive matches and build your record."],
  ["02", "RANKINGS", "Track your progress on the player leaderboard."],
  ["03", "PLAYER STATS", "Follow your performance and match history."],
  ["04", "TEAMS & COMMUNITY", "Play together and grow with the community."],
];

export default function Home() {
  const [showIntro, setShowIntro] = useState(false);

  useEffect(() => {
    try { setShowIntro(localStorage.getItem("cf-welcome-accepted") !== "yes"); }
    catch { setShowIntro(true); }
  }, []);

  function acceptIntro() {
    try { localStorage.setItem("cf-welcome-accepted", "yes"); } catch {}
    setShowIntro(false);
  }

  return (
    <main className="site-shell">
      <header className="topbar">
        <a className="brand" href="/" aria-label="Counter Flame ana sayfa">
          <img src="/counterflame-logo.svg" alt="" />
          <span>COUNTER<span>FLAME</span><small>FACEIT</small></span>
        </a>
        <div className="topbar-right"><i /> COMPETITIVE GAMING PLATFORM</div>
      </header>

      <section className="hero">
        <div className="hero-orbit" />
        <p className="eyebrow">WELCOME TO THE ARENA</p>
        <h1>PLAY WITH<br /><span>PASSION.</span></h1>
        <p className="hero-copy">A competitive home for players who want to improve, compete and make their mark.</p>
        <div className="hero-line"><span /></div>
        <p className="hero-note">YOUR GAME. YOUR RANK. YOUR LEGACY.</p>
      </section>

      <section className="feature-grid" aria-label="Platform features">
        {features.map(([number, title, description]) => (
          <article className="feature" key={number}>
            <span className="feature-number">{number}</span>
            <h2>{title}</h2>
            <p>{description}</p>
          </article>
        ))}
      </section>

      <footer className="footer"><span>COUNTERFLAME FACEIT</span><span>BUILT FOR COMPETITION <b>✦</b></span></footer>

      {showIntro && (
        <div className="intro-backdrop" role="dialog" aria-modal="true" aria-labelledby="intro-title">
          <section className="intro-card">
            <div className="card-topline"><span>OFFICIAL PLATFORM NOTICE</span><span className="live-dot">● ONLINE</span></div>
            <div className="intro-logo"><img src="/counterflame-logo.svg" alt="Counter Flame CF logo" /></div>
            <p className="intro-overline">WELCOME TO THE ARENA</p>
            <h2 id="intro-title">COUNTER <span>FLAME</span></h2>
            <div className="faceit-label">F A C E I T</div>
            <div className="orange-rule" />
            <h3>Welcome to Counter Flame FACEIT!</h3>
            <p className="intro-copy">Our goal is to create a competitive gaming platform where players can challenge themselves, improve their skills and compete together.</p>
            <p className="intro-copy">Discover matchmaking, player rankings, statistics, teams and a growing community — all in one place. We are constantly working to make your experience smoother, fairer and better.</p>
            <div className="intro-features">
              {["MATCHMAKING", "RANKINGS", "STATISTICS", "TEAMS", "COMMUNITY"].map((item) => <span key={item}>{item}</span>)}
            </div>
            <p className="thanks">Thank you for being part of <b>Counter Flame.</b></p>
            <button className="understand-button" onClick={acceptIntro}>I UNDERSTAND <span>→</span></button>
            <p className="card-foot">COMPETE WITH RESPECT · PLAY WITH PASSION</p>
          </section>
        </div>
      )}
    </main>
  );
}
