"use client";

import { useState } from "react";
import {
  Activity, ArrowUpRight, Bell, ChevronDown, ChevronRight, CircleHelp,
  Crosshair, Flame, Gamepad2, Globe2, LayoutDashboard, Medal, Menu,
  Search, Settings, ShieldCheck, Swords, Trophy, Users, X, Zap
} from "lucide-react";

type Section = "Overview" | "Play" | "Rankings" | "Teams" | "Statistics" | "Profile" | "Settings";
const nav: { label: Section; icon: typeof LayoutDashboard }[] = [
  { label: "Overview", icon: LayoutDashboard },
  { label: "Play", icon: Gamepad2 },
  { label: "Rankings", icon: Trophy },
  { label: "Teams", icon: Users },
  { label: "Statistics", icon: Activity },
];
const modes = [
  { id: "1v1", name: "DUEL", detail: "One player. One opponent." },
  { id: "2v2", name: "DOUBLES", detail: "Two-player team format." },
  { id: "3v3", name: "TRIOS", detail: "Three-player team format." },
  { id: "4v4", name: "SQUAD", detail: "Four-player team format." },
  { id: "5v5", name: "COMPETITIVE", detail: "The classic full team." },
];

function Brand({ compact = false }: { compact?: boolean }) {
  return <div className={compact ? "brand brand-compact" : "brand"}>
    <img src="/counterflame-logo.svg" alt="" />
    <span>COUNTER<span className="brand-accent">FLAME</span><small>COMPETITIVE PLATFORM</small></span>
  </div>;
}

export default function Home() {
  const [entered, setEntered] = useState(false);
  const [section, setSection] = useState<Section>("Overview");
  const [mode, setMode] = useState("5v5");
  const [notice, setNotice] = useState("");
  const [mobileNav, setMobileNav] = useState(false);
  const [showAccount, setShowAccount] = useState(false);

  const notify = (message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 3200);
  };

  if (!entered) return <main className="gate">
    <div className="gate-grid" />
    <div className="gate-glow" />
    <header className="gate-header"><Brand compact /><span className="gate-version"><i /> PLATFORM PREVIEW</span></header>
    <section className="gate-content">
      <div className="gate-copy">
        <div className="eyebrow"><span /> BUILT FOR THE COMPETITIVE</div>
        <h1>PROVE<br />YOUR <em>FIRE.</em></h1>
        <p className="gate-lead">A new home for competitive Counter-Strike. Find your level, build your squad and earn your place.</p>
        <button className="primary-button gate-cta" onClick={() => setEntered(true)}>ENTER THE ARENA <ArrowUpRight size={17} /></button>
        <div className="gate-meta"><span><ShieldCheck size={14}/> FAIR PLAY FIRST</span><span><Globe2 size={14}/> BUILT FOR PLAYERS</span></div>
      </div>
      <div className="gate-art" aria-hidden="true">
        <div className="art-ring ring-one" /><div className="art-ring ring-two" />
        <div className="art-orbit"><span /><span /><span /></div>
        <img src="/counterflame-logo.svg" alt="" />
        <div className="art-caption"><b>CF / 001</b><span>THE NEXT ROUND STARTS HERE</span></div>
      </div>
    </section>
    <footer className="gate-footer"><span>COUNTER FLAME © 2026</span><span>COMPETE WITH PURPOSE <b>✦</b></span></footer>
  </main>;

  const titles: Record<Section, { kicker: string; title: string; desc: string }> = {
    Overview: { kicker: "COMMAND CENTER", title: "YOUR ARENA.", desc: "Your competitive journey starts here. Everything in one place." },
    Play: { kicker: "MATCHMAKING", title: "FIND YOUR MATCH.", desc: "Choose your format. Your next challenge is waiting." },
    Rankings: { kicker: "GLOBAL LEADERBOARD", title: "THE CLIMB.", desc: "A fair ranking system built around verified competitive results." },
    Teams: { kicker: "SQUAD MANAGEMENT", title: "PLAY TOGETHER.", desc: "Build a roster, invite teammates and compete as one." },
    Statistics: { kicker: "PERFORMANCE CENTER", title: "THE NUMBERS.", desc: "Understand your performance with clear, meaningful statistics." },
    Profile: { kicker: "PLAYER ID", title: "YOUR PROFILE.", desc: "Your identity and competitive record." },
    Settings: { kicker: "PREFERENCES", title: "YOUR SETTINGS.", desc: "Manage your platform preferences." },
  };

  const choose = (item: Section) => { setSection(item); setMobileNav(false); setNotice(""); };

  return <main className="app-shell">
    <aside className={mobileNav ? "sidebar sidebar-open" : "sidebar"}>
      <div className="sidebar-head"><Brand /><button className="mobile-close" onClick={() => setMobileNav(false)} aria-label="Close menu"><X size={18}/></button></div>
      <div className="nav-caption">PLATFORM</div>
      <nav className="main-nav" aria-label="Main navigation">
        {nav.map(({ label, icon: Icon }) => <button key={label} className={section === label ? "nav-item active" : "nav-item"} onClick={() => choose(label)}><Icon size={17}/><span>{label}</span>{label === "Play" && <i className="nav-tag">LIVE SOON</i>}</button>)}
      </nav>
      <div className="nav-caption nav-caption-spaced">ACCOUNT</div>
      <button className={section === "Profile" ? "nav-item active" : "nav-item"} onClick={() => choose("Profile")}><Medal size={17}/><span>My Profile</span></button>
      <button className={section === "Settings" ? "nav-item active" : "nav-item"} onClick={() => choose("Settings")}><Settings size={17}/><span>Settings</span></button>
      <div className="sidebar-bottom">
        <div className="season-box"><div className="season-top"><Flame size={16}/><span>SEASON 00</span><i>PRE-SEASON</i></div><b>THE FOUNDATION</b><p>The arena is getting ready.</p><div className="season-line"><i/></div></div>
        <button className="player-chip" onClick={() => choose("Profile")}><span className="player-avatar">P</span><span className="player-details"><b>PLAYER ONE</b><small>UNRANKED</small></span><ChevronDown size={15}/></button>
      </div>
    </aside>
    {mobileNav && <button className="mobile-scrim" onClick={() => setMobileNav(false)} aria-label="Close navigation" />}
    <section className="workspace">
      <header className="topbar">
        <div className="topbar-left"><button className="mobile-menu" onClick={() => setMobileNav(true)} aria-label="Open menu"><Menu size={19}/></button><span>COUNTER FLAME</span><ChevronRight size={13}/><b>{section.toUpperCase()}</b></div>
        <div className="topbar-right"><span className="online-state"><i/> PREVIEW ENVIRONMENT</span><button className="top-icon" aria-label="Search" onClick={() => notify("Search will be enabled when player data is connected.")}><Search size={17}/></button><button className="top-icon" aria-label="Notifications" onClick={() => notify("No notifications yet.")}><Bell size={17}/></button><button className="top-user" onClick={() => choose("Profile")}>P</button></div>
      </header>
      <div className="page-content">
        <div className="page-heading"><div><div className="eyebrow"><span/>{titles[section].kicker}</div><h1>{titles[section].title}</h1><p>{titles[section].desc}</p></div><div className="region-pill"><Globe2 size={14}/><span>EUROPE</span><i/></div></div>

        {section === "Overview" && <>
          <section className="hero-panel"><div className="hero-text"><div className="hero-kicker"><span/> WELCOME TO THE NEXT ROUND</div><h2>MAKE<br/><em>YOUR MARK.</em></h2><p>Queue up with players at your level. Every match is a chance to prove yourself.</p><button className="primary-button" onClick={() => choose("Play")}>EXPLORE GAME MODES <ChevronRight size={16}/></button></div><div className="hero-symbol">CF</div><div className="hero-foot"><span>COUNTER FLAME / SEASON 00</span><span>BUILT TO COMPETE <b>✦</b></span></div></section>
          <div className="section-title"><div><span>01 / YOUR PROGRESS</span><h2>PLAYER OVERVIEW</h2></div><small>NO MATCH DATA YET</small></div>
          <div className="stats-grid">
            <article className="stat-tile"><div><span>CF ELO</span><Medal size={17}/></div><strong>—</strong><small>Complete ranked matches to get rated</small></article>
            <article className="stat-tile"><div><span>MATCHES</span><Swords size={17}/></div><strong>—</strong><small>Your match history will appear here</small></article>
            <article className="stat-tile"><div><span>WIN RATE</span><Activity size={17}/></div><strong>—<i>%</i></strong><small>Calculated from completed matches</small></article>
            <article className="stat-tile"><div><span>GLOBAL RANK</span><Trophy size={17}/></div><strong>—</strong><small>Earn your place on the ladder</small></article>
          </div>
          <div className="section-title section-title-spaced"><div><span>02 / CHOOSE YOUR FORMAT</span><h2>GAME MODES</h2></div><button className="subtle-link" onClick={() => choose("Play")}>VIEW ALL <ChevronRight size={14}/></button></div>
          <div className="mode-grid">{modes.map((m, i) => <button key={m.id} className={mode === m.id ? "mode-tile selected" : "mode-tile"} onClick={() => {setMode(m.id);choose("Play");}}><span className="mode-index">0{i+1}</span><b>{m.id}</b><small>{m.name}</small><ChevronRight className="mode-chevron" size={16}/></button>)}</div>
          <div className="bottom-grid"><section className="content-panel"><div className="panel-title"><div><span>03 / ACTIVITY</span><h3>RECENT MATCHES</h3></div><small>EMPTY</small></div><div className="empty-panel"><div><Activity size={20}/></div><b>YOUR STORY STARTS HERE</b><p>Completed matches and results will show up here.</p></div></section><section className="content-panel bulletin"><div className="panel-title"><div><span>04 / ANNOUNCEMENTS</span><h3>ARENA BULLETIN</h3></div><i/></div><div className="bulletin-entry"><small>WELCOME</small><b>The arena is taking shape.</b><p>We are building a competitive space focused on fair play and great matches.</p></div><div className="bulletin-signoff"><ShieldCheck size={14}/> PLAY FAIR. PLAY TOGETHER.</div></section></div>
        </>}

        {section === "Play" && <><div className="play-layout"><section className="play-main"><div className="section-title"><div><span>01 / SELECT A QUEUE</span><h2>CHOOSE YOUR MODE</h2></div><small>5 FORMATS</small></div><div className="play-mode-list">{modes.map((m, i) => <button key={m.id} className={mode === m.id ? "play-mode selected" : "play-mode"} onClick={() => setMode(m.id)}><span className="play-mode-num">0{i+1}</span><span className="play-mode-name"><b>{m.id}</b><small>{m.name} · {m.detail}</small></span><span className="mode-select">{mode === m.id ? "SELECTED" : "SELECT"}</span></button>)}</div><div className="queue-box"><div><span className="queue-label"><i/> MATCHMAKING STATUS</span><b>QUEUE SERVICE NOT CONNECTED</b><p>Matchmaking will become available when the queue backend is configured. No players or queue times are simulated.</p></div><button className="primary-button disabled-button" disabled>QUEUE UNAVAILABLE</button></div></section><aside className="play-aside"><div className="aside-icon"><Crosshair size={22}/></div><span>YOUR NEXT MATCH</span><h3>READY WHEN<br/>YOU ARE.</h3><p>Select a format to see its requirements and matchmaking status.</p><div className="aside-selected"><small>SELECTED FORMAT</small><b>{mode}</b></div></aside></div></>}

        {section === "Rankings" && <EmptyFeature icon={<Trophy size={26}/>} title="THE LADDER IS WAITING." copy="Rankings will appear when verified match results and the rating system are connected." />}
        {section === "Teams" && <EmptyFeature icon={<Users size={26}/>} title="YOUR SQUAD STARTS HERE." copy="Team creation, invites and rosters will be enabled with the team service." />}
        {section === "Statistics" && <EmptyFeature icon={<Activity size={26}/>} title="EVERY ROUND COUNTS." copy="Your performance dashboard will be populated from completed match records." />}
        {section === "Profile" && <EmptyFeature icon={<Medal size={26}/>} title="PLAYER PROFILE." copy="Account identity, avatar, ELO and match history will appear here after authentication is connected." />}
        {section === "Settings" && <div className="settings-card"><div><span>ACCOUNT</span><b>Authentication is not connected</b><p>Account security and profile preferences will be available after Supabase Auth is configured.</p></div><div><span>INTERFACE</span><b>Language</b><p>English interface preview.</p></div><div><span>REGION</span><b>Europe</b><p>Matchmaking region selection will be available with the queue service.</p></div></div>}
        <footer className="page-footer"><span>COUNTER FLAME © 2026</span><span>BUILT FOR COMPETITION <b>✦</b></span></footer>
      </div>
    </section>
    {notice && <div className="toast" role="status">{notice}<button onClick={() => setNotice("")} aria-label="Dismiss">×</button></div>}
  </main>;
}

function EmptyFeature({ icon, title, copy }: { icon: React.ReactNode; title: string; copy: string }) {
  return <section className="feature-empty"><div className="feature-empty-icon">{icon}</div><span>COMING ONLINE</span><h2>{title}</h2><p>{copy}</p><div className="feature-empty-line"/></section>;
}
