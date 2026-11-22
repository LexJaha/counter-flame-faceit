"use client";

import { FormEvent, useEffect, useState } from "react";

const features = [
  ["01", "MATCHMAKING", "Find competitive matches and build your record."],
  ["02", "RANKINGS", "Track your progress on the player leaderboard."],
  ["03", "PLAYER STATS", "Follow your performance and match history."],
  ["04", "TEAMS & COMMUNITY", "Play together and grow with the community."],
];

type Stage = "loading" | "welcome" | "start" | "login";

export default function Home() {
  const [stage, setStage] = useState<Stage>("loading");
  const [loginMode, setLoginMode] = useState<"signin" | "signup">("signin");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    try {
      setStage(localStorage.getItem("cf-welcome-accepted") === "yes" ? "login" : "welcome");
    } catch { setStage("welcome"); }
  }, []);

  function acceptIntro() {
    try { localStorage.setItem("cf-welcome-accepted", "yes"); } catch {}
    setStage("start");
  }

  function openLogin() { setStage("login"); }

  function submitLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice("Your sign-in screen is ready. Account authentication will be enabled when the platform's login service is connected.");
  }

  return (
    <main className="site-shell">
      <header className="topbar">
        <a className="brand" href="/" aria-label="Counter Flame home">
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

      {stage !== "loading" && stage !== "login" && (
        <div className="intro-backdrop" role="dialog" aria-modal="true">
          {stage === "welcome" ? (
            <section className="intro-card">
              <div className="card-topline"><span>OFFICIAL PLATFORM NOTICE</span><span className="live-dot">● ONLINE</span></div>
              <div className="intro-logo"><img src="/counterflame-logo.svg" alt="Counter Flame emblem" /></div>
              <p className="intro-overline">WELCOME TO THE ARENA</p>
              <h2>COUNTER <span>FLAME</span></h2>
              <div className="faceit-label">F A C E I T</div>
              <div className="orange-rule" />
              <h3>Welcome to Counter Flame FACEIT!</h3>
              <p className="intro-copy">Our goal is to create a competitive gaming platform where players can challenge themselves, improve their skills and compete together.</p>
              <p className="intro-copy">Discover matchmaking, player rankings, statistics, teams and a growing community — all in one place. We are constantly working to make your experience smoother, fairer and better.</p>
              <div className="intro-features">{["MATCHMAKING", "RANKINGS", "STATISTICS", "TEAMS", "COMMUNITY"].map(item => <span key={item}>{item}</span>)}</div>
              <p className="thanks">Thank you for being part of <b>Counter Flame.</b></p>
              <button className="understand-button" onClick={acceptIntro}>I UNDERSTAND <span>→</span></button>
              <p className="card-foot">COMPETE WITH RESPECT · PLAY WITH PASSION</p>
            </section>
          ) : (
            <section className="start-card">
              <img className="start-emblem" src="/counterflame-logo.svg" alt="Counter Flame emblem" />
              <p className="intro-overline">THE ARENA IS WAITING</p>
              <h2>READY TO <span>ENTER?</span></h2>
              <p>Your competition. Your journey. It starts here.</p>
              <button className="understand-button" onClick={openLogin}>ŞİMDİ BAŞLA <span>→</span></button>
              <button className="text-back" onClick={() => setStage("welcome")}>BACK</button>
            </section>
          )}
        </div>
      )}

      {stage === "login" && (
        <div className="login-screen">
          <div className="login-ambient" />
          <section className="login-layout">
            <div className="login-brand-panel">
              <img className="login-emblem" src="/counterflame-logo.svg" alt="Counter Flame emblem" />
              <p className="intro-overline">WELCOME TO THE ARENA</p>
              <h1>RISE<br /><span>ABOVE.</span></h1>
              <p className="login-tagline">ONE PLATFORM. EVERY CHALLENGE.</p>
              <div className="login-brand-line" />
              <p className="login-small">COUNTER FLAME FACEIT</p>
            </div>
            <div className="login-panel">
              <div className="login-panel-top"><span>PLAYER ACCESS</span><span className="live-dot">● SECURE AREA</span></div>
              <div className="login-mini-brand"><img src="/counterflame-logo.svg" alt="" /><span>COUNTER <b>FLAME</b></span></div>
              <h2>{loginMode === "signin" ? "WELCOME BACK" : "JOIN THE ARENA"}</h2>
              <p className="login-subtitle">{loginMode === "signin" ? "Sign in to continue your journey." : "Create your player account to get started."}</p>
              <div className="login-tabs">
                <button className={loginMode === "signin" ? "active" : ""} onClick={() => {setLoginMode("signin");setNotice("");}}>SIGN IN</button>
                <button className={loginMode === "signup" ? "active" : ""} onClick={() => {setLoginMode("signup");setNotice("");}}>CREATE ACCOUNT</button>
              </div>
              <form className="login-form" onSubmit={submitLogin}>
                {loginMode === "signup" && <label>PLAYER NAME<input name="username" placeholder="Your player name" autoComplete="username" required /></label>}
                <label>EMAIL ADDRESS<input type="email" name="email" placeholder="name@example.com" autoComplete="email" required /></label>
                <label>PASSWORD<input type="password" name="password" placeholder="Enter your password" autoComplete={loginMode === "signin" ? "current-password" : "new-password"} minLength={8} required /></label>
                {loginMode === "signin" && <button className="forgot-button" type="button" onClick={() => setNotice("Password recovery will be available after account authentication is connected.")}>FORGOT PASSWORD?</button>}
                <button className="login-submit" type="submit">{loginMode === "signin" ? "SIGN IN" : "CREATE ACCOUNT"} <span>↗</span></button>
              </form>
              {notice && <p className="login-notice" role="status">{notice}</p>}
              <p className="login-terms">BY CONTINUING, YOU AGREE TO PLAY FAIR AND RESPECT THE COMMUNITY.</p>
              <button className="text-back login-back" onClick={() => setStage("start")}>← BACK</button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
