"use client";

import { FormEvent, useEffect, useState } from "react";
import {
  Activity, ArrowDownRight, ArrowUpRight, Bell, ChevronRight, CircleHelp,
  Crosshair, Flame, Gamepad2, LayoutDashboard, Medal, Search, Settings,
  ShieldCheck, Swords, Trophy, Users, WalletCards, Zap
} from "lucide-react";

const features = [
  ["01", "MATCHMAKING", "Find competitive matches and build your record."],
  ["02", "RANKINGS", "Track your progress on the player leaderboard."],
  ["03", "PLAYER STATS", "Follow your performance and match history."],
  ["04", "TEAMS & COMMUNITY", "Play together and grow with the community."],
];

const navigation = [
  { label: "Home", icon: LayoutDashboard },
  { label: "Play", icon: Gamepad2 },
  { label: "Rankings", icon: Trophy },
  { label: "Teams", icon: Users },
  { label: "Statistics", icon: Activity },
];

type Stage = "loading" | "welcome" | "start" | "login" | "greeting" | "home";

function Dashboard({ playerName }: { playerName: string }) {
  const [active, setActive] = useState("Home");
  const [notice, setNotice] = useState("");
  const [mode, setMode] = useState("5v5");

  const sectionCopy: Record<string, { title: string; description: string }> = {
    Home: { title: "YOUR ARENA STARTS HERE", description: "Everything you need for your competitive journey, in one place." },
    Play: { title: "FIND YOUR NEXT MATCH", description: "Choose a format and get ready to compete. Matchmaking will be enabled when the queue service is connected." },
    Rankings: { title: "CLIMB THE LADDER", description: "Player rankings will appear here when competitive match data is connected." },
    Teams: { title: "BUILT TO WIN TOGETHER", description: "Create your squad and take on the arena. Team features are coming soon." },
    Statistics: { title: "TRACK YOUR PROGRESS", description: "Your verified match history and performance data will live here." },
  };

  return (
    <div className="dashboard">
      <aside className="dash-sidebar">
        <a className="dash-brand" href="/" aria-label="Counter Flame">
          <img src="/counterflame-logo.svg" alt="" />
          <span>COUNTER<span>FLAME</span><small>COMPETITIVE PLATFORM</small></span>
        </a>
        <div className="side-label">PLATFORM</div>
        <nav className="side-nav" aria-label="Main navigation">
          {navigation.map(({ label, icon: Icon }) => (
            <button key={label} className={active === label ? "side-link active" : "side-link"} onClick={() => { setActive(label); setNotice(""); }}>
              <Icon size={17} strokeWidth={1.8} /><span>{label}</span>{label === "Play" && <i className="nav-hot">NEW</i>}
            </button>
          ))}
        </nav>
        <div className="side-label side-label-bottom">PERSONAL</div>
        <button className="side-link" onClick={() => setNotice("Player settings will be available with account profiles.")}><Settings size={17}/><span>Settings</span></button>
        <button className="side-link" onClick={() => setNotice("Help center is being prepared.")}><CircleHelp size={17}/><span>Help center</span></button>
        <div className="sidebar-bottom">
          <div className="season-card"><div className="season-icon"><Flame size={17}/></div><b>SEASON ZERO</b><span>The arena is being prepared.</span><div className="season-progress"><i/></div><small>PLATFORM PREVIEW</small></div>
          <div className="sidebar-user"><div className="user-avatar">{(playerName || "P").slice(0,1).toUpperCase()}</div><div><b>{playerName || "PLAYER"}</b><span>NEW CHALLENGER</span></div><button aria-label="Player settings" onClick={() => setNotice("Player settings will be available with account profiles.")}><Settings size={15}/></button></div>
        </div>
      </aside>

      <main className="dash-main">
        <header className="dash-topbar">
          <div className="dash-breadcrumb"><span>COUNTER FLAME</span><ChevronRight size={13}/><b>{active.toUpperCase()}</b></div>
          <div className="dash-top-actions"><div className="system-status"><i/> SYSTEM PREVIEW</div><button className="icon-button" aria-label="Search" onClick={() => setNotice("Search will be available when platform data is connected.")}><Search size={17}/></button><button className="icon-button notification-button" aria-label="Notifications" onClick={() => setNotice("You're all caught up. No notifications yet.")}><Bell size={17}/></button><div className="top-avatar">{(playerName || "P").slice(0,1).toUpperCase()}</div></div>
        </header>

        <div className="dash-content">
          <div className="dash-welcome-row"><div><p className="dash-eyebrow"><span/> THE COMPETITIVE PLATFORM</p><h1>{active === "Home" ? <>WELCOME BACK, <em>{playerName || "PLAYER"}</em></> : sectionCopy[active].title}</h1><p className="dash-description">{sectionCopy[active].description}</p></div><div className="date-chip"><span>YOUR STATUS</span><b><i/> ROOKIE</b></div></div>

          {active === "Home" ? (
            <>
              <section className="arena-banner">
                <div className="banner-glow"/><div className="banner-mark">CF</div><div className="banner-content"><div className="banner-kicker"><span/> THE NEXT LEVEL BEGINS NOW</div><h2>ENTER THE<br/><strong>ARENA.</strong></h2><p>Find your team. Choose your mode. Make every round count.</p><button onClick={() => setActive("Play")}>EXPLORE GAME MODES <ChevronRight size={16}/></button></div><div className="banner-bottom"><span>COUNTER FLAME / SEASON 00</span><span>PLAY WITH PURPOSE <b>✦</b></span></div>
              </section>

              <div className="section-heading"><div><span className="section-index">01 / OVERVIEW</span><h2>YOUR DASHBOARD</h2></div><span className="muted-label">PLAYER SNAPSHOT</span></div>
              <section className="stat-grid">
                <article className="stat-card"><div className="stat-top"><span>CF ELO RATING</span><Medal size={17}/></div><div className="stat-value">—</div><div className="stat-foot">Awaiting first ranked match</div><div className="stat-mark"><ArrowUpRight size={19}/></div></article>
                <article className="stat-card"><div className="stat-top"><span>MATCHES PLAYED</span><Swords size={17}/></div><div className="stat-value">—</div><div className="stat-foot">No match history yet</div><div className="stat-mark"><Crosshair size={19}/></div></article>
                <article className="stat-card"><div className="stat-top"><span>WIN RATE</span><Activity size={17}/></div><div className="stat-value">—<small>%</small></div><div className="stat-foot">Calculated after your matches</div><div className="stat-mark"><ArrowDownRight size={19}/></div></article>
                <article className="stat-card"><div className="stat-top"><span>GLOBAL RANK</span><Trophy size={17}/></div><div className="stat-value">—</div><div className="stat-foot">Play ranked to get placed</div><div className="stat-mark"><Zap size={19}/></div></article>
              </section>

              <div className="section-heading mode-heading"><div><span className="section-index">02 / CHOOSE YOUR FORMAT</span><h2>GAME MODES</h2></div><button className="text-action" onClick={() => setActive("Play")}>ALL MODES <ChevronRight size={15}/></button></div>
              <section className="mode-grid">
                {["1v1","2v2","3v3","4v4","5v5"].map((item, index) => <button key={item} className={mode === item ? "mode-card selected" : "mode-card"} onClick={() => {setMode(item);setNotice(item + " selected. Matchmaking will be available when the queue service is connected.");}}><span className="mode-number">0{index+1}</span><b>{item}</b><span className="mode-caption">{item === "1v1" ? "DUEL" : item === "5v5" ? "FULL TEAM" : "TEAM MATCH"}</span><span className="mode-arrow"><ChevronRight size={16}/></span></button>)}
              </section>
              <div className="lower-grid">
                <section className="activity-panel"><div className="panel-heading"><div><span className="section-index">03 / YOUR JOURNEY</span><h3>RECENT ACTIVITY</h3></div><span className="empty-tag">NO DATA YET</span></div><div className="empty-state"><div className="empty-icon"><Activity size={22}/></div><b>YOUR STORY STARTS HERE</b><p>Your match history and recent results will appear here after you play.</p></div></section>
                <section className="notice-panel"><div className="panel-heading"><div><span className="section-index">04 / THE LATEST</span><h3>ARENA BULLETIN</h3></div><span className="bulletin-dot"/></div><div className="bulletin-item"><span className="bulletin-label">WELCOME</span><b>Welcome to Counter Flame</b><p>Your competitive home is taking shape. More features are on the way.</p></div><div className="bulletin-footer"><ShieldCheck size={15}/> FAIR PLAY. STRONG COMMUNITY.</div></section>
              </div>
            </>
          ) : (
            <section className="placeholder-section"><div className="placeholder-emblem"><img src="/counterflame-logo.svg" alt="Counter Flame"/></div><span className="section-index">COUNTER FLAME / {active.toUpperCase()}</span><h2>{active === "Play" ? "CHOOSE YOUR BATTLE" : sectionCopy[active].title}</h2><p>{sectionCopy[active].description}</p>{active === "Play" && <div className="placeholder-modes">{["1v1","2v2","3v3","4v4","5v5"].map(item=><button key={item} className={mode===item?"selected":""} onClick={()=>setMode(item)}>{item}</button>)}</div>}<div className="coming-soon"><span/> {active === "Play" ? "MATCHMAKING SERVICE NOT CONNECTED" : "COMING TO THE ARENA"}</div><button className="return-home" onClick={()=>setActive("Home")}>BACK TO HOME <ChevronRight size={15}/></button></section>
          )}
          {notice && <div className="dash-toast" role="status">{notice}<button onClick={()=>setNotice("")}>×</button></div>}
          <footer className="dash-footer"><span>© 2026 COUNTER FLAME FACEIT</span><span>BUILT FOR COMPETITION <b>✦</b></span></footer>
        </div>
      </main>
    </div>
  );
}

export default function Home() {
  const [stage, setStage] = useState<Stage>("loading");
  const [loginMode, setLoginMode] = useState<"signin" | "signup">("signin");
  const [notice, setNotice] = useState("");
  const [playerName, setPlayerName] = useState("");

  useEffect(() => {
    try { setStage(localStorage.getItem("cf-welcome-accepted") === "yes" ? "login" : "welcome"); }
    catch { setStage("welcome"); }
  }, []);

  function acceptIntro() {
    try { localStorage.setItem("cf-welcome-accepted", "yes"); } catch {}
    setStage("start");
  }
  function submitLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const typedName = String(data.get("username") || "").trim();
    const emailName = String(data.get("email") || "").split("@")[0].trim();
    const name = typedName || emailName || "PLAYER";
    setPlayerName(name);
    try { localStorage.setItem("cf-player-name", name); } catch {}
    setNotice("");
    setStage("greeting");
  }

  if (stage === "loading") return <main className="site-shell"/>;
  if (stage === "home") return <Dashboard playerName={playerName || "PLAYER"}/>;

  return (
    <main className="site-shell">
      <header className="topbar"><a className="brand" href="/" aria-label="Counter Flame home"><img src="/counterflame-logo.svg" alt=""/><span>COUNTER<span>FLAME</span><small>FACEIT</small></span></a><div className="topbar-right"><i/> COMPETITIVE GAMING PLATFORM</div></header>
      <section className="hero"><div className="hero-orbit"/><p className="eyebrow">WELCOME TO THE ARENA</p><h1>PLAY WITH<br/><span>PASSION.</span></h1><p className="hero-copy">A competitive home for players who want to improve, compete and make their mark.</p><div className="hero-line"><span/></div><p className="hero-note">YOUR GAME. YOUR RANK. YOUR LEGACY.</p></section>
      <section className="feature-grid" aria-label="Platform features">{features.map(([number,title,description])=><article className="feature" key={number}><span className="feature-number">{number}</span><h2>{title}</h2><p>{description}</p></article>)}</section>
      <footer className="footer"><span>COUNTERFLAME FACEIT</span><span>BUILT FOR COMPETITION <b>✦</b></span></footer>

      {(stage === "welcome" || stage === "start") && <div className="intro-backdrop" role="dialog" aria-modal="true">{stage === "welcome" ? <section className="intro-card"><div className="card-topline"><span>OFFICIAL PLATFORM NOTICE</span><span className="live-dot">● ONLINE</span></div><div className="intro-logo"><img src="/counterflame-logo.svg" alt="Counter Flame emblem"/></div><p className="intro-overline">WELCOME TO THE ARENA</p><h2>COUNTER <span>FLAME</span></h2><div className="faceit-label">F A C E I T</div><div className="orange-rule"/><h3>Welcome to Counter Flame FACEIT!</h3><p className="intro-copy">Our goal is to create a competitive gaming platform where players can challenge themselves, improve their skills and compete together.</p><p className="intro-copy">Discover matchmaking, player rankings, statistics, teams and a growing community — all in one place. We are constantly working to make your experience smoother, fairer and better.</p><div className="intro-features">{["MATCHMAKING","RANKINGS","STATISTICS","TEAMS","COMMUNITY"].map(item=><span key={item}>{item}</span>)}</div><p className="thanks">Thank you for being part of <b>Counter Flame.</b></p><button className="understand-button" onClick={acceptIntro}>I UNDERSTAND <span>→</span></button><p className="card-foot">COMPETE WITH RESPECT · PLAY WITH PASSION</p></section> : <section className="start-card"><img className="start-emblem" src="/counterflame-logo.svg" alt="Counter Flame emblem"/><p className="intro-overline">THE ARENA IS WAITING</p><h2>READY TO <span>ENTER?</span></h2><p>Your competition. Your journey. It starts here.</p><button className="understand-button" onClick={()=>setStage("login")}>ENTER THE ARENA <span>→</span></button><button className="text-back" onClick={()=>setStage("welcome")}>BACK</button></section>}</div>}

      {stage === "greeting" && <div className="player-welcome" role="status" aria-live="polite"><div className="welcome-vignette"/><div className="welcome-grid"/><div className="welcome-logo-halo"><div className="welcome-logo-ring ring-one"/><div className="welcome-logo-ring ring-two"/><div className="welcome-logo-ring ring-three"/><img src="/counterflame-logo.svg" alt=""/></div><div className="welcome-content"><p className="welcome-kicker">COUNTER FLAME // PLAYER ACCESS</p><h1>WELCOME</h1><div className="welcome-player">{playerName}</div><div className="welcome-divider"><span/></div><p className="welcome-caption">YOUR ARENA. YOUR MOMENT. YOUR LEGACY.</p><button className="welcome-enter" onClick={()=>setStage("home")}>ENTER THE PLATFORM <span>↗</span></button></div><div className="welcome-corner welcome-corner-tl">CF / 001</div><div className="welcome-corner welcome-corner-br">COMPETE WITH HONOR</div></div>}

      {stage === "login" && <div className="login-screen"><div className="login-ambient"/><section className="login-layout"><div className="login-brand-panel"><img className="login-emblem" src="/counterflame-logo.svg" alt="Counter Flame emblem"/><p className="intro-overline">WELCOME TO THE ARENA</p><h1>RISE<br/><span>ABOVE.</span></h1><p className="login-tagline">ONE PLATFORM. EVERY CHALLENGE.</p><div className="login-brand-line"/><p className="login-small">COUNTER FLAME FACEIT</p></div><div className="login-panel"><div className="login-panel-top"><span>PLAYER ACCESS</span><span className="live-dot">● SECURE AREA</span></div><div className="login-mini-brand"><img src="/counterflame-logo.svg" alt=""/><span>COUNTER <b>FLAME</b></span></div><h2>{loginMode === "signin" ? "WELCOME BACK" : "JOIN THE ARENA"}</h2><p className="login-subtitle">{loginMode === "signin" ? "Sign in to continue your journey." : "Create your player account to get started."}</p><div className="login-tabs"><button className={loginMode === "signin" ? "active" : ""} onClick={()=>{setLoginMode("signin");setNotice("");}}>SIGN IN</button><button className={loginMode === "signup" ? "active" : ""} onClick={()=>{setLoginMode("signup");setNotice("");}}>CREATE ACCOUNT</button></div><form className="login-form" onSubmit={submitLogin}>{loginMode === "signup" && <label>PLAYER NAME<input name="username" placeholder="Your player name" autoComplete="username" required/></label>}<label>EMAIL ADDRESS<input type="email" name="email" placeholder="name@example.com" autoComplete="email" required/></label><label>PASSWORD<input type="password" name="password" placeholder="Enter your password" autoComplete={loginMode === "signin" ? "current-password" : "new-password"} minLength={8} required/></label>{loginMode === "signin" && <button className="forgot-button" type="button" onClick={()=>setNotice("Password recovery will be available after account authentication is connected.")}>FORGOT PASSWORD?</button>}<button className="login-submit" type="submit">{loginMode === "signin" ? "SIGN IN" : "CREATE ACCOUNT"} <span>↗</span></button></form>{notice && <p className="login-notice" role="status">{notice}</p>}<p className="login-terms">BY CONTINUING, YOU AGREE TO PLAY FAIR AND RESPECT THE COMMUNITY.</p><button className="text-back login-back" onClick={()=>setStage("start")}>← BACK</button></div></section></div>}
    </main>
  );
}
