"use client";

import { useCallback, useEffect, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import {
  Activity, Bell, CheckCircle2, ChevronRight, Clock, Copy, Flame, Gamepad2,
  LayoutDashboard, LogOut, Medal, MessageSquare, Plus, RefreshCw, Search,
  Send, ShieldCheck, Swords, Trophy, UploadCloud, Users, X, Zap
} from "lucide-react";
import { supabase } from "@/lib/supabase";

type Profile = { id: string; username: string; elo: number; wins: number; losses: number; matches_played: number; bio?: string | null };
type Match = { id: string; code: string; mode: string; map: string; status: string; created_at: string; created_by?: string | null };
type Player = { user_id: string; team_no: number; username: string; elo: number };
type ChatMessage = { id: string; match_id: string; sender_id: string; body: string; created_at: string };
type PendingResult = { match_id: string; winner_team: number; score1: number; score2: number; submitted_by: string; created_at: string };

const modes = ["1v1", "2v2", "3v3", "4v4", "5v5"];
const maps = ["Random", "Harbor", "Factory", "Outpost", "District"];
const navItems = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "matchmaking", label: "Matchmaking", icon: Swords },
  { id: "leaderboard", label: "Leaderboard", icon: Trophy },
  { id: "room", label: "Match room", icon: MessageSquare },
];

export default function Home() {
  const [session, setSession] = useState<any>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [leaderboard, setLeaderboard] = useState<Profile[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [activeMatch, setActiveMatch] = useState<Match | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [pendingResults, setPendingResults] = useState<PendingResult[]>([]);
  const [isModerator, setIsModerator] = useState(false);
  const [view, setView] = useState("overview");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [authMode, setAuthMode] = useState<"in" | "up">("in");
  const [mode, setMode] = useState("5v5");
  const [map, setMap] = useState("Random");
  const [joinCode, setJoinCode] = useState("");
  const [draft, setDraft] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [queueState, setQueueState] = useState("");
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null);
  const [winner, setWinner] = useState("1");
  const [score1, setScore1] = useState("13");
  const [score2, setScore2] = useState("8");
  const user = session?.user;
  const configured = Boolean(supabase);

  const loadProfile = useCallback(async (id: string) => {
    if (!supabase) return;
    const { data } = await supabase.from("profiles").select("*").eq("id", id).maybeSingle();
    setProfile((data as Profile | null) ?? null);
  }, []);

  const loadLeaderboard = useCallback(async () => {
    if (!supabase) return;
    const { data, error } = await supabase.from("profiles")
      .select("id,username,elo,wins,losses,matches_played")
      .order("elo", { ascending: false }).limit(20);
    if (!error) setLeaderboard((data || []) as Profile[]);
  }, []);

  const loadMatches = useCallback(async () => {
    if (!supabase || !user) return;
    const { data, error } = await supabase.from("cf_matches")
      .select("id,code,mode,map,status,created_at,created_by")
      .eq("status", "ready").order("created_at", { ascending: false }).limit(20);
    if (!error) setMatches((data || []) as Match[]);
  }, [user]);

  const loadPendingResults = useCallback(async () => {
    if (!supabase || !isModerator) return;
    const { data } = await supabase.from("cf_match_results")
      .select("match_id,winner_team,score1,score2,submitted_by,created_at")
      .eq("status", "pending").order("created_at", { ascending: true }).limit(50);
    setPendingResults((data || []) as PendingResult[]);
  }, [isModerator]);

  const loadMatch = useCallback(async (id: string) => {
    if (!supabase) return;
    const { data, error } = await supabase.from("cf_matches")
      .select("id,code,mode,map,status,created_at,created_by").eq("id", id).single();
    if (error || !data) { setNotice(error?.message || "Match not found."); return; }
    setActiveMatch(data as Match);
    const { data: rows } = await supabase.from("cf_match_players")
      .select("user_id,team_no").eq("match_id", id);
    const playerRows = rows || [];
    const ids = playerRows.map((row: any) => row.user_id);
    let profileRows: any[] = [];
    if (ids.length) {
      const result = await supabase.from("profiles").select("id,username,elo").in("id", ids);
      profileRows = result.data || [];
    }
    setPlayers(playerRows.map((row: any) => {
      const p = profileRows.find((item) => item.id === row.user_id);
      return { user_id: row.user_id, team_no: row.team_no, username: p?.username || "Player", elo: p?.elo || 1000 };
    }));
    const { data: chat } = await supabase.from("cf_match_messages")
      .select("*").eq("match_id", id).order("created_at", { ascending: true }).limit(100);
    setMessages((chat || []) as ChatMessage[]);
  }, []);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, value) => setSession(value));
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) { setProfile(null); setMatches([]); setActiveMatch(null); return; }
    void loadProfile(user.id);
    void loadMatches();
    void loadLeaderboard();
    supabase?.rpc("cf_is_moderator").then(({ data }) => setIsModerator(Boolean(data)));
  }, [user, loadProfile, loadMatches, loadLeaderboard]);

  useEffect(() => {
    if (!user || !supabase) return;
    const channel = supabase.channel("cf-queue-" + user.id)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "cf_match_queue", filter: "user_id=eq." + user.id },
        (payload) => {
          const matchId = (payload.new as any).match_id as string | null;
          if (matchId) {
            setQueueState("");
            setNotice("Match found. Your room is ready.");
            setView("room");
            void loadMatch(matchId);
          }
        })
      .subscribe();
    return () => { void supabase?.removeChannel(channel); };
  }, [user?.id, loadMatch]);

  useEffect(() => {
    if (!activeMatch || !supabase) return;
    const channel = supabase.channel("cf-room-" + activeMatch.id)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "cf_match_messages", filter: "match_id=eq." + activeMatch.id },
        (payload) => setMessages((old) => old.some((item) => item.id === (payload.new as any).id) ? old : [...old, payload.new as ChatMessage]))
      .on("postgres_changes", { event: "*", schema: "public", table: "cf_match_players", filter: "match_id=eq." + activeMatch.id },
        () => { void loadMatch(activeMatch.id); })
      .subscribe();
    return () => { void supabase?.removeChannel(channel); };
  }, [activeMatch?.id, loadMatch]);

  useEffect(() => {
    if (isModerator) void loadPendingResults();
  }, [isModerator, loadPendingResults]);

  async function authenticate() {
    if (!supabase) return;
    setBusy(true); setNotice("");
    try {
      const result = authMode === "up"
        ? await supabase.auth.signUp({ email, password, options: { data: { username: username.trim() } } })
        : await supabase.auth.signInWithPassword({ email, password });
      if (result.error) throw result.error;
      setNotice(authMode === "up" && !result.data.session
        ? "Account created. Check your email if confirmation is enabled."
        : "Welcome to CounterFlame.");
    } catch (error: any) { setNotice(error.message || "Authentication failed."); }
    finally { setBusy(false); }
  }

  async function createMatch() {
    if (!supabase) return;
    setBusy(true); setNotice("");
    try {
      const { data, error } = await supabase.rpc("cf_create_match", { p_mode: mode, p_map: map });
      if (error) throw error;
      await loadMatch(data.match_id);
      setView("room");
      setNotice("Lobby created. Share the six-digit Match Code.");
      await loadMatches();
    } catch (error: any) { setNotice(error.message || "Could not create lobby."); }
    finally { setBusy(false); }
  }

  async function joinByCode() {
    if (!supabase || joinCode.length !== 6) return;
    setBusy(true); setNotice("");
    try {
      const { data, error } = await supabase.rpc("cf_join_match_by_code", { p_code: joinCode });
      if (error) throw error;
      await loadMatch(data);
      setView("room");
      setNotice("You joined the lobby.");
      await loadMatches();
    } catch (error: any) { setNotice(error.message || "Could not join lobby."); }
    finally { setBusy(false); }
  }

  async function joinQueue() {
    if (!supabase) return;
    setBusy(true); setNotice("");
    try {
      const { data, error } = await supabase.rpc("cf_join_matchmaking", { p_mode: mode });
      if (error) throw error;
      if (data?.status === "matched" && data.match_id) {
        await loadMatch(data.match_id); setView("room"); setQueueState("");
        setNotice("Match found. Your room is ready.");
      } else {
        setQueueState("waiting");
        setNotice(`Searching: ${data?.players_found ?? 1}/${data?.players_needed ?? "?"} players found.`);
      }
    } catch (error: any) { setNotice(error.message || "Matchmaking failed."); }
    finally { setBusy(false); }
  }

  async function leaveQueue() {
    if (!supabase) return;
    setBusy(true);
    const { error } = await supabase.rpc("cf_leave_matchmaking");
    if (error) setNotice(error.message);
    else { setQueueState(""); setNotice("You left the queue."); }
    setBusy(false);
  }

  async function sendMessage(event: FormEvent) {
    event.preventDefault();
    if (!supabase || !user || !activeMatch || !draft.trim()) return;
    const body = draft.trim(); setDraft("");
    const { error } = await supabase.from("cf_match_messages")
      .insert({ match_id: activeMatch.id, sender_id: user.id, body });
    if (error) setNotice(error.message);
  }

  async function uploadEvidence() {
    if (!supabase || !user || !activeMatch || !evidenceFile) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(evidenceFile.type) || evidenceFile.size > 10 * 1024 * 1024) {
      setNotice("Use a JPG, PNG or WebP image up to 10 MB."); return;
    }
    setBusy(true);
    try {
      const path = `${user.id}/${activeMatch.id}/${Date.now()}-${evidenceFile.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      const { error: uploadError } = await supabase.storage.from("cf-match-evidence").upload(path, evidenceFile, { contentType: evidenceFile.type, upsert: false });
      if (uploadError) throw uploadError;
      const { error } = await supabase.from("cf_match_evidence").insert({
        match_id: activeMatch.id, submitted_by: user.id, storage_path: path, note: "Player submitted screenshot"
      });
      if (error) throw error;
      setEvidenceFile(null); setNotice("Screenshot submitted for moderator review.");
    } catch (error: any) { setNotice(error.message || "Evidence upload failed."); }
    finally { setBusy(false); }
  }

  async function submitResult() {
    if (!supabase || !activeMatch) return;
    setBusy(true);
    const { error } = await supabase.rpc("cf_submit_result", {
      p_match: activeMatch.id, p_winner: Number(winner), p_score1: Number(score1), p_score2: Number(score2),
      p_confidence: null, p_stats: []
    });
    setNotice(error ? error.message : "Result submitted. ELO stays unchanged until moderator approval.");
    setBusy(false);
  }

  async function reviewResult(matchId: string, approve: boolean) {
    if (!supabase) return;
    setBusy(true);
    const { error } = await supabase.rpc("cf_review_result", { p_match: matchId, p_approve: approve, p_note: approve ? "Reviewed by CounterFlame moderator" : "Evidence needs another review" });
    if (error) setNotice(error.message);
    else { setNotice(approve ? "Result approved and ELO updated." : "Result rejected."); await loadPendingResults(); await loadLeaderboard(); }
    setBusy(false);
  }

  async function signOut() {
    await supabase?.auth.signOut();
    setActiveMatch(null); setView("overview"); setQueueState("");
  }

  async function copyCode() {
    if (!activeMatch) return;
    try { await navigator.clipboard.writeText(activeMatch.code); setNotice("Match Code copied."); }
    catch { setNotice("Copy is not available in this browser."); }
  }

  const winRate = profile?.matches_played ? Math.round((profile.wins / profile.matches_played) * 100) : 0;

  return (
    <main className="cf-shell">
      <header className="topbar">
        <a className="brand" href="#"><span className="brand-mark"><Flame size={22}/></span><span><b>COUNTERFLAME <em>FACEIT</em></b><small>COMPETITIVE COMMUNITY PLATFORM</small></span></a>
        <div className="top-actions">
          <span className="season-pill"><span/> SEASON 01 · BETA</span>
          {user ? <><span className="user-chip"><span className="avatar">{(profile?.username || user.email || "P").slice(0,1).toUpperCase()}</span><b>{profile?.username || user.email}</b></span><button className="icon-btn" onClick={signOut} title="Sign out"><LogOut size={17}/></button></> : <span className="online-pill">SYSTEM ONLINE</span>}
        </div>
      </header>

      <div className="hero">
        <div className="hero-copy">
          <div className="eyebrow"><span className="eyebrow-line"/> THE NEXT LEVEL OF COMPETITION</div>
          <h1>PLAY TO <span>PROVE.</span><br/>CLIMB THE RANKS.</h1>
          <p>Find your team, create a match, submit proof and earn your place on the CounterFlame leaderboard.</p>
          <div className="hero-buttons"><button className="btn-primary" onClick={() => setView(user ? "matchmaking" : "overview")}>FIND A MATCH <ChevronRight size={17}/></button><button className="btn-ghost" onClick={() => setView("leaderboard")}>VIEW RANKINGS</button></div>
        </div>
        <div className="hero-art"><div className="orbit orbit-one"/><div className="orbit orbit-two"/><div className="hero-flame"><Flame size={104} strokeWidth={1.2}/></div><div className="hero-stat"><small>PLATFORM STATUS</small><b><span/> LIVE BETA</b></div><div className="hero-version">CF / V1000</div></div>
      </div>

      <section className="stat-grid">
        <Stat icon={<Swords/>} label="MATCH MODES" value="1v1 — 5v5" detail="Ranked-ready queue"/>
        <Stat icon={<Users/>} label="PLAYER BASE" value={String(leaderboard.length).padStart(2,"0")} detail="Registered profiles"/>
        <Stat icon={<Trophy/>} label="TOP RATING" value={leaderboard[0]?.elo?.toLocaleString() || "—"} detail={leaderboard[0]?.username || "Awaiting players"}/>
        <Stat icon={<ShieldCheck/>} label="RESULT SYSTEM" value="REVIEWED" detail="Evidence-first ranking"/>
      </section>

      {notice && <div className="notice"><span>{notice}</span><button onClick={() => setNotice("")}><X size={16}/></button></div>}

      {!user ? (
        <section className="auth-layout">
          <div className="section-heading"><div><span className="eyebrow">PLAYER ACCESS</span><h2>ENTER THE ARENA</h2><p>Sign in to join matchmaking and create match rooms.</p></div><ShieldCheck className="heading-icon"/></div>
          <div className="auth-card">
            <div className="auth-tabs"><button className={authMode==="in"?"selected":""} onClick={()=>setAuthMode("in")}>SIGN IN</button><button className={authMode==="up"?"selected":""} onClick={()=>setAuthMode("up")}>CREATE ACCOUNT</button></div>
            {authMode==="up" && <input className="cf-input" placeholder="Player name (3–20 characters)" value={username} onChange={e=>setUsername(e.target.value)} maxLength={20}/>}
            <input className="cf-input" type="email" placeholder="Email address" value={email} onChange={e=>setEmail(e.target.value)}/>
            <input className="cf-input" type="password" placeholder="Password (at least 6 characters)" value={password} onChange={e=>setPassword(e.target.value)}/>
            <button className="btn-primary full" disabled={!configured||busy||!email||password.length<6||(authMode==="up"&&username.trim().length<3)} onClick={authenticate}>{busy?"PLEASE WAIT":authMode==="in"?"SIGN IN TO COUNTERFLAME":"CREATE PLAYER ACCOUNT"} <ChevronRight size={17}/></button>
            {!configured && <p className="muted small">Add the Supabase URL and publishable key to the deployment environment to enable account access.</p>}
            <p className="auth-foot"><ShieldCheck size={14}/> Your account and match data are protected by Supabase Auth and RLS.</p>
          </div>
        </section>
      ) : (
        <div className="workspace">
          <aside className="sidebar">
            <div className="side-label">MAIN MENU</div>
            {navItems.map(item=><button key={item.id} className={view===item.id?"nav-link active":"nav-link"} onClick={()=>setView(item.id)}><item.icon size={18}/><span>{item.label}</span>{view===item.id&&<ChevronRight size={15}/>}</button>)}
            <div className="side-label side-gap">PLAYER CARD</div>
            <div className="player-card"><div className="player-avatar">{(profile?.username||"P").slice(0,1).toUpperCase()}</div><b>{profile?.username || "Player"}</b><span className="rank-label">RATING · {profile?.elo ?? 1000} ELO</span><div className="player-mini-stats"><span><b>{profile?.wins ?? 0}</b><small>WINS</small></span><span><b>{profile?.losses ?? 0}</b><small>LOSSES</small></span><span><b>{winRate}%</b><small>WIN RATE</small></span></div></div>
            <div className="sidebar-bottom"><span className="green-dot"/> ALL SYSTEMS OPERATIONAL</div>
          </aside>

          <section className="main-panel">
            {view==="overview" && <>
              <div className="section-heading"><div><span className="eyebrow">COMMAND CENTER</span><h2>WELCOME BACK, {(profile?.username||"PLAYER").toUpperCase()}</h2><p>Your competitive dashboard is ready.</p></div><button className="btn-ghost compact" onClick={()=>{void loadMatches();void loadLeaderboard();}}><RefreshCw size={15}/> REFRESH</button></div>
              <div className="overview-grid">
                <div className="panel-card feature-card"><div className="card-top"><span className="tag-orange">QUICK PLAY</span><Zap size={20}/></div><h3>FIND YOUR<br/><em>NEXT MATCH.</em></h3><p>Jump into the queue and let the matchmaking system find a balanced lobby.</p><button className="btn-primary" onClick={()=>setView("matchmaking")}>OPEN MATCHMAKING <ChevronRight size={16}/></button></div>
                <div className="panel-card"><div className="card-top"><span className="tag-muted">YOUR PERFORMANCE</span><Activity size={19}/></div><div className="performance-number">{profile?.elo ?? 1000}<small> ELO</small></div><div className="progress-track"><span style={{width:Math.min(100,Math.max(4,((profile?.elo??1000)/3000)*100))+"%"}}/></div><div className="performance-foot"><span>{profile?.matches_played??0} matches</span><span>{winRate}% win rate</span></div><div className="mini-divider"/><div className="small-stat-row"><span>Victories</span><b>{profile?.wins??0}</b></div><div className="small-stat-row"><span>Defeats</span><b>{profile?.losses??0}</b></div></div>
              </div>
              <div className="section-heading sub-heading"><div><span className="eyebrow">OPEN ROOMS</span><h2>AVAILABLE MATCHES</h2></div><button className="text-action" onClick={()=>setView("matchmaking")}>SEE ALL <ChevronRight size={15}/></button></div>
              <MatchList matches={matches} onJoin={(code)=>{setJoinCode(code);setView("matchmaking");}}/>
              <Leaderboard rows={leaderboard.slice(0,5)}/>
            </>}

            {view==="matchmaking" && <>
              <div className="section-heading"><div><span className="eyebrow">COMPETITIVE QUEUE</span><h2>MATCHMAKING</h2><p>Choose your mode, create a private room or join the queue.</p></div><Swords className="heading-icon"/></div>
              <div className="matchmaking-grid">
                <div className="panel-card"><div className="card-top"><span className="tag-orange">RANKED SEARCH</span><Zap size={19}/></div><h3>FIND A MATCH</h3><p className="muted">Players are grouped by mode and approximate ELO.</p><label className="field-label">GAME MODE</label><div className="mode-grid">{modes.map(item=><button key={item} className={mode===item?"mode-option selected":"mode-option"} onClick={()=>setMode(item)}>{item}</button>)}</div><button className="btn-primary full" disabled={busy} onClick={joinQueue}>{queueState==="waiting"?"SEARCHING FOR PLAYERS":"JOIN MATCHMAKING QUEUE"} <ChevronRight size={16}/></button>{queueState==="waiting"&&<button className="btn-ghost full mt-2" onClick={leaveQueue}>LEAVE QUEUE</button>}</div>
                <div className="panel-card"><div className="card-top"><span className="tag-muted">PRIVATE LOBBY</span><Users size={19}/></div><h3>CREATE A ROOM</h3><p className="muted">Choose a mode and map, then invite players with your unique code.</p><label className="field-label">MODE</label><select className="cf-input" value={mode} onChange={e=>setMode(e.target.value)}>{modes.map(item=><option key={item}>{item}</option>)}</select><label className="field-label">MAP POOL</label><select className="cf-input" value={map} onChange={e=>setMap(e.target.value)}>{maps.map(item=><option key={item}>{item}</option>)}</select><button className="btn-primary full" disabled={busy} onClick={createMatch}><Plus size={17}/> CREATE MATCH ROOM</button></div>
              </div>
              <div className="panel-card join-card"><div><span className="eyebrow">HAVE AN INVITE?</span><h3>JOIN WITH MATCH CODE</h3><p className="muted">Enter the six-digit code shared by the room host.</p></div><div className="join-control"><input className="cf-input code-input" inputMode="numeric" maxLength={6} placeholder="000000" value={joinCode} onChange={e=>setJoinCode(e.target.value.replace(/\D/g,""))}/><button className="btn-primary" disabled={busy||joinCode.length!==6} onClick={joinByCode}>JOIN ROOM <ChevronRight size={16}/></button></div></div>
              <div className="section-heading sub-heading"><div><span className="eyebrow">PUBLIC ROOMS</span><h2>OPEN LOBBIES</h2></div><button className="text-action" onClick={loadMatches}><RefreshCw size={14}/> REFRESH</button></div><MatchList matches={matches} onJoin={(code)=>setJoinCode(code)}/>
            </>}

            {view==="leaderboard" && <><div className="section-heading"><div><span className="eyebrow">SEASON 01</span><h2>GLOBAL LEADERBOARD</h2><p>Rankings include only moderator-approved match results.</p></div><Trophy className="heading-icon"/></div><Leaderboard rows={leaderboard}/></>}

            {view==="room" && <>{activeMatch ? <MatchRoom match={activeMatch} players={players} messages={messages} userId={user.id} draft={draft} setDraft={setDraft} onSend={sendMessage} onCopy={copyCode} evidenceFile={evidenceFile} setEvidenceFile={setEvidenceFile} onUpload={uploadEvidence} busy={busy} winner={winner} setWinner={setWinner} score1={score1} setScore1={setScore1} score2={score2} setScore2={setScore2} onSubmitResult={submitResult}/> : <div className="panel-card empty-state"><Gamepad2 size={34}/><h3>NO ACTIVE ROOM</h3><p>Join a match with a code or create a new lobby.</p><button className="btn-primary" onClick={()=>setView("matchmaking")}>FIND A MATCH</button></div>}</>}

            {isModerator && <section className="moderator-panel"><div className="section-heading"><div><span className="eyebrow">STAFF TOOLS</span><h2>RESULT REVIEW QUEUE</h2></div><ShieldCheck className="heading-icon"/></div>{pendingResults.length===0?<p className="muted">No pending match results.</p>:pendingResults.map(item=><div className="review-row" key={item.match_id}><div><b>{item.score1} : {item.score2}</b><span>Winner: Team {item.winner_team} · {new Date(item.created_at).toLocaleString("tr-TR")}</span><small>{item.match_id.slice(0,8)}…</small></div><div className="review-actions"><button className="btn-ghost compact" disabled={busy} onClick={()=>reviewResult(item.match_id,false)}>REJECT</button><button className="btn-primary compact" disabled={busy} onClick={()=>reviewResult(item.match_id,true)}><CheckCircle2 size={14}/> APPROVE</button></div></div>)}</section>}
          </section>
        </div>
      )}

      <footer className="footer"><span>COUNTERFLAME <b>FACEIT</b> · V1000 DEVELOPMENT TRACK</span><span>COMMUNITY PROJECT · NOT AFFILIATED WITH ANY GAME PUBLISHER</span></footer>
    </main>
  );
}

function Stat({icon,label,value,detail}:{icon:ReactNode;label:string;value:string;detail:string}) {
  return <div className="stat-card"><div className="stat-icon">{icon}</div><div><small>{label}</small><b>{value}</b><span>{detail}</span></div></div>;
}

function MatchList({matches,onJoin}:{matches:Match[];onJoin:(code:string)=>void}) {
  if (!matches.length) return <div className="empty-list"><Search size={22}/><b>No open rooms found</b><span>Create a room or join the matchmaking queue.</span></div>;
  return <div className="match-list">{matches.map(match=><div className="match-row" key={match.id}><div className="match-mode-icon"><Swords size={18}/></div><div className="match-info"><b>{match.mode} · {match.map}</b><span><Clock size={12}/> {new Date(match.created_at).toLocaleTimeString("tr-TR",{hour:"2-digit",minute:"2-digit"})} · OPEN ROOM</span></div><div className="match-code"><small>MATCH CODE</small><b>{match.code}</b></div><button className="btn-ghost compact" onClick={()=>onJoin(match.code)}>USE CODE <ChevronRight size={14}/></button></div>)}</div>;
}

function Leaderboard({rows}:{rows:Profile[]}) {
  return <div className="leaderboard panel-card"><div className="card-top"><div><span className="eyebrow">TOP PLAYERS</span><h3>RANKINGS</h3></div><Medal className="heading-icon"/></div>{rows.length===0?<div className="empty-list"><Trophy size={24}/><b>Rankings will appear here</b><span>Complete verified matches to earn ELO.</span></div>:rows.map((row,index)=><div className="leader-row" key={row.id}><div className={"rank-number "+(index===0?"gold":"")}>{String(index+1).padStart(2,"0")}</div><div className="leader-avatar">{row.username.slice(0,1).toUpperCase()}</div><div className="leader-name"><b>{row.username}</b><span>{row.matches_played} MATCHES · {row.wins} WINS</span></div><div className="leader-elo"><b>{row.elo.toLocaleString()}</b><small>ELO</small></div></div>)}</div>;
}

function MatchRoom({match,players,messages,userId,draft,setDraft,onSend,onCopy,evidenceFile,setEvidenceFile,onUpload,busy,winner,setWinner,score1,setScore1,score2,setScore2,onSubmitResult}:{
  match:Match;players:Player[];messages:ChatMessage[];userId:string;draft:string;setDraft:(v:string)=>void;onSend:(e:FormEvent)=>void;onCopy:()=>void;
  evidenceFile:File|null;setEvidenceFile:(v:File|null)=>void;onUpload:()=>void;busy:boolean;winner:string;setWinner:(v:string)=>void;score1:string;setScore1:(v:string)=>void;score2:string;setScore2:(v:string)=>void;onSubmitResult:()=>void;
}) {
  return <><div className="section-heading"><div><span className="eyebrow">LIVE MATCH SPACE</span><h2>MATCH ROOM</h2><p>Coordinate with players, share evidence and report the result.</p></div><span className="tag-orange">{match.status.toUpperCase()}</span></div>
    <div className="room-grid"><div className="panel-card room-main"><div className="room-code"><div><small>YOUR MATCH CODE</small><b>{match.code}</b></div><button className="btn-ghost compact" onClick={onCopy}><Copy size={15}/> COPY</button></div><div className="room-meta"><div><small>GAME MODE</small><b>{match.mode}</b></div><div><small>MAP</small><b>{match.map}</b></div><div><small>PLAYERS</small><b>{players.length} / {Number(match.mode[0])*2}</b></div></div><div className="teams"><div><span className="team-title">TEAM 01</span>{players.filter(p=>p.team_no===1).map(p=><div className="team-player" key={p.user_id}><span className="player-dot"/><b>{p.username}{p.user_id===userId?" (YOU)":""}</b><small>{p.elo} ELO</small></div>)}</div><div><span className="team-title team-two">TEAM 02</span>{players.filter(p=>p.team_no===2).map(p=><div className="team-player" key={p.user_id}><span className="player-dot alt"/><b>{p.username}{p.user_id===userId?" (YOU)":""}</b><small>{p.elo} ELO</small></div>)}</div></div><div className="mini-divider"/><div className="card-top"><h3>SUBMIT SCREENSHOT</h3><UploadCloud size={18}/></div><p className="muted small">JPG, PNG or WebP · Max 10 MB. Evidence is stored privately for review.</p><input className="cf-input file-input" type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>setEvidenceFile(e.target.files?.[0]||null)}/><button className="btn-ghost full" disabled={!evidenceFile||busy} onClick={onUpload}>UPLOAD EVIDENCE</button><div className="mini-divider"/><h3>REPORT MATCH RESULT</h3><p className="muted small">A moderator must review the evidence before ELO changes.</p><div className="result-controls"><select className="cf-input" value={winner} onChange={e=>setWinner(e.target.value)}><option value="1">Team 01 won</option><option value="2">Team 02 won</option></select><input className="cf-input" type="number" min="0" max="99" value={score1} onChange={e=>setScore1(e.target.value)} aria-label="Team one score"/><input className="cf-input" type="number" min="0" max="99" value={score2} onChange={e=>setScore2(e.target.value)} aria-label="Team two score"/></div><button className="btn-primary full" disabled={busy} onClick={onSubmitResult}>SUBMIT RESULT FOR REVIEW</button></div>
      <div className="panel-card chat-card"><div className="card-top"><div><span className="eyebrow">TEAM COMMUNICATION</span><h3>MATCH CHAT</h3></div><MessageSquare size={19}/></div><div className="chat-messages">{messages.length===0?<div className="chat-empty">No messages yet.<br/>Start the conversation.</div>:messages.map(message=><div className={message.sender_id===userId?"chat-message mine":"chat-message"} key={message.id}><small>{message.sender_id===userId?"YOU":"PLAYER"} · {new Date(message.created_at).toLocaleTimeString("tr-TR",{hour:"2-digit",minute:"2-digit"})}</small><p>{message.body}</p></div>)}</div><form className="chat-form" onSubmit={onSend}><input className="cf-input" value={draft} onChange={e=>setDraft(e.target.value)} maxLength={1000} placeholder="Write a message…"/><button className="btn-primary send-btn" disabled={!draft.trim()}><Send size={16}/></button></form></div></div></>;
}
