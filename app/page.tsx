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
type DirectThread = { conversation_id: string; peer_id: string; peer_name: string; peer_elo: number; last_message: string; updated_at: string };
type DirectMessage = { id: string; conversation_id: string; sender_id: string; body: string; created_at: string };
type TeamMember = { user_id: string; username: string; elo: number; role: string };
type TeamData = { id: string; name: string; tag: string; description: string; role: string; members: TeamMember[] };
type TeamListing = { id: string; name: string; tag: string; description: string; member_count: number };

const modes = ["1v1", "2v2", "3v3", "4v4", "5v5"];
const maps = ["Random", "Harbor", "Factory", "Outpost", "District"];
const navItems = [
  { id: "overview", label: "Genel Bakış", icon: LayoutDashboard, group: "ANA MENÜ" },
  { id: "matchmaking", label: "Eşleştirme", icon: Swords, group: "OYNA" },
  { id: "room", label: "Match Room", icon: MessageSquare, group: "OYNA" },
  { id: "leaderboard", label: "Sıralama", icon: Trophy, group: "REKABET" },
  { id: "teams", label: "Takımlar", icon: Users, group: "REKABET" },
  { id: "tournaments", label: "Turnuvalar", icon: Medal, group: "REKABET" },
  { id: "messages", label: "Mesajlar", icon: Send, group: "SOSYAL" },
  { id: "notifications", label: "Bildirimler", icon: Bell, group: "SOSYAL" },
  { id: "profile", label: "Oyuncu Profili", icon: Activity, group: "HESAP" },
  { id: "settings", label: "Ayarlar", icon: ShieldCheck, group: "HESAP" },
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
  const [profileUsername, setProfileUsername] = useState("");
  const [profileBio, setProfileBio] = useState("");
  const [playerSearch, setPlayerSearch] = useState("");
  const [playerResults, setPlayerResults] = useState<Profile[]>([]);
  const [directThreads, setDirectThreads] = useState<DirectThread[]>([]);
  const [activeConversation, setActiveConversation] = useState<string | null>(null);
  const [activePeer, setActivePeer] = useState<Profile | null>(null);
  const [directMessages, setDirectMessages] = useState<DirectMessage[]>([]);
  const [directDraft, setDirectDraft] = useState("");
  const [myTeam, setMyTeam] = useState<TeamData | null>(null);
  const [teamDirectory, setTeamDirectory] = useState<TeamListing[]>([]);
  const [teamName, setTeamName] = useState("");
  const [teamTag, setTeamTag] = useState("");
  const [teamDescription, setTeamDescription] = useState("");
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

  const loadConversations = useCallback(async () => {
    if (!supabase || !user) return;
    const { data: threads, error } = await supabase.from("cf_direct_threads")
      .select("conversation_id,user_low,user_high")
      .or(`user_low.eq.${user.id},user_high.eq.${user.id}`);
    if (error || !threads?.length) { setDirectThreads([]); return; }
    const ids = threads.map((thread: any) => thread.conversation_id);
    const peerIds = threads.map((thread: any) => thread.user_low === user.id ? thread.user_high : thread.user_low);
    const [{ data: people }, { data: latest }] = await Promise.all([
      supabase.from("profiles").select("id,username,elo,wins,losses,matches_played").in("id", peerIds),
      supabase.from("cf_messages").select("conversation_id,body,created_at").in("conversation_id", ids).order("created_at", { ascending: false }).limit(100)
    ]);
    const list = threads.map((thread: any) => {
      const peerId = thread.user_low === user.id ? thread.user_high : thread.user_low;
      const person = (people || []).find((item: any) => item.id === peerId);
      const last = (latest || []).find((item: any) => item.conversation_id === thread.conversation_id);
      return { conversation_id: thread.conversation_id, peer_id: peerId, peer_name: person?.username || "Player", peer_elo: person?.elo || 1000, last_message: last?.body || "Start a conversation", updated_at: last?.created_at || "" };
    }).sort((a: DirectThread,b: DirectThread) => b.updated_at.localeCompare(a.updated_at));
    setDirectThreads(list);
  }, [user]);

  const loadDirectMessages = useCallback(async (conversationId: string) => {
    if (!supabase) return;
    const { data, error } = await supabase.from("cf_messages").select("*")
      .eq("conversation_id", conversationId).order("created_at", { ascending: true }).limit(100);
    if (!error) setDirectMessages((data || []) as DirectMessage[]);
  }, []);

  const loadTeams = useCallback(async () => {
    if (!supabase || !user) return;
    const [{ data: membership }, { data: allTeams }] = await Promise.all([
      supabase.from("cf_team_members").select("team_id,role").eq("user_id", user.id).maybeSingle(),
      supabase.from("cf_teams").select("id,name,tag,description").order("created_at", { ascending: false }).limit(50)
    ]);
    if (membership) {
      const [{ data: team }, { data: members }] = await Promise.all([
        supabase.from("cf_teams").select("id,name,tag,description").eq("id", membership.team_id).single(),
        supabase.from("cf_team_members").select("team_id,user_id,role").eq("team_id", membership.team_id)
      ]);
      const ids = (members || []).map((item: any) => item.user_id);
      const { data: people } = ids.length ? await supabase.from("profiles").select("id,username,elo").in("id", ids) : { data: [] as any[] };
      if (team) setMyTeam({
        ...team, role: membership.role,
        members: (members || []).map((item: any) => {
          const p = (people || []).find((person: any) => person.id === item.user_id);
          return { user_id: item.user_id, username: p?.username || "Player", elo: p?.elo || 1000, role: item.role };
        })
      });
    } else setMyTeam(null);
    const teamIds = (allTeams || []).map((item: any) => item.id);
    const { data: roster } = teamIds.length ? await supabase.from("cf_team_members").select("team_id,user_id").in("team_id", teamIds) : { data: [] as any[] };
    setTeamDirectory((allTeams || []).map((team: any) => ({
      ...team, member_count: (roster || []).filter((member: any) => member.team_id === team.id).length
    })));
  }, [user]);

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
    void loadConversations();
    void loadTeams();
    supabase?.rpc("cf_is_moderator").then(({ data }) => setIsModerator(Boolean(data)));
  }, [user, loadProfile, loadMatches, loadLeaderboard, loadConversations, loadTeams]);

  useEffect(() => {
    setProfileUsername(profile?.username || "");
    setProfileBio(profile?.bio || "");
  }, [profile?.id, profile?.username, profile?.bio]);

  useEffect(() => {
    if (!activeConversation || !supabase) return;
    void loadDirectMessages(activeConversation);
    const channel = supabase.channel("cf-dm-" + activeConversation)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "cf_messages", filter: "conversation_id=eq." + activeConversation },
        (payload) => setDirectMessages(old => old.some(item => item.id === (payload.new as any).id) ? old : [...old, payload.new as DirectMessage]))
      .subscribe();
    return () => { void supabase?.removeChannel(channel); };
  }, [activeConversation, loadDirectMessages]);

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
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "cf_matches", filter: "id=eq." + activeMatch.id },
        (payload) => setActiveMatch(payload.new as Match))
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

  async function createTeam() {
    if (!supabase) return;
    setBusy(true);
    const { error } = await supabase.rpc("cf_create_team", {
      p_name: teamName.trim(), p_tag: teamTag.trim().toUpperCase(), p_description: teamDescription.trim()
    });
    if (error) setNotice(error.message);
    else { setTeamName(""); setTeamTag(""); setTeamDescription(""); setNotice("Team created. You are the captain."); await loadTeams(); }
    setBusy(false);
  }

  async function joinTeam(teamId: string) {
    if (!supabase) return;
    setBusy(true);
    const { error } = await supabase.rpc("cf_join_team", { p_team: teamId });
    if (error) setNotice(error.message);
    else { setNotice("You joined the team."); await loadTeams(); }
    setBusy(false);
  }

  async function leaveTeam() {
    if (!supabase) return;
    setBusy(true);
    const { error } = await supabase.rpc("cf_leave_team");
    if (error) setNotice(error.message);
    else { setNotice("You left the team."); await loadTeams(); }
    setBusy(false);
  }

  async function searchPlayers() {
    if (!supabase || !playerSearch.trim() || playerSearch.trim().length < 2) { setPlayerResults([]); return; }
    const { data, error } = await supabase.from("profiles")
      .select("id,username,elo,wins,losses,matches_played")
      .ilike("username", `%${playerSearch.trim().replace(/[%_]/g, "")}%`)
      .neq("id", user.id).order("elo", { ascending: false }).limit(12);
    if (error) setNotice(error.message);
    else setPlayerResults((data || []) as Profile[]);
  }

  async function openDirectMessage(peer: Profile) {
    if (!supabase) return;
    setBusy(true);
    try {
      const { data, error } = await supabase.rpc("cf_open_dm", { p_other: peer.id });
      if (error) throw error;
      setActiveConversation(data as string);
      setActivePeer(peer);
      setView("messages");
      await loadDirectMessages(data as string);
      await loadConversations();
    } catch (error: any) { setNotice(error.message || "Could not open conversation."); }
    finally { setBusy(false); }
  }

  async function sendDirectMessage(event: FormEvent) {
    event.preventDefault();
    if (!supabase || !user || !activeConversation || !directDraft.trim()) return;
    const body = directDraft.trim();
    setDirectDraft("");
    const { error } = await supabase.from("cf_messages").insert({
      conversation_id: activeConversation, sender_id: user.id, body
    });
    if (error) { setDirectDraft(body); setNotice(error.message); }
    else void loadConversations();
  }

  async function saveProfile() {
    if (!supabase || !user) return;
    const cleanName = profileUsername.trim();
    const cleanBio = profileBio.trim();
    if (cleanName.length < 3 || cleanName.length > 20) { setNotice("Player name must be 3–20 characters."); return; }
    setBusy(true);
    const { data, error } = await supabase.from("profiles")
      .update({ username: cleanName, bio: cleanBio.slice(0, 240), updated_at: new Date().toISOString() })
      .eq("id", user.id).select("*").single();
    if (error) setNotice(error.message);
    else { setProfile(data as Profile); setNotice("Player profile saved."); }
    setBusy(false);
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

      <aside className="global-sidebar">
        <div className="menu-brand">
          <span className="menu-brand-icon"><Flame size={18}/></span>
          <span><b>CF <em>ARENA</em></b><small>CONTROL CENTER</small></span>
          <span className="menu-live"><i/> LIVE</span>
        </div>
        <div className="menu-caption">NAVIGATION</div>
        {[
          {name:"OVERVIEW", title:"GENEL BAKIŞ", hint:"Ana kontrol merkezi"},
          {name:"PLAY", title:"OYUN", hint:"Eşleş ve odaya katıl"},
          {name:"COMPETE", title:"REKABET", hint:"Sıralama ve organizasyon"},
          {name:"COMMUNITY", title:"TOPLULUK", hint:"Sosyal alanlar"},
          {name:"ACCOUNT", title:"OYUNCU", hint:"Profil ve tercihler"}
        ].map(section => {
          const groupItems = navItems.filter(item =>
            section.name==="OVERVIEW" ? item.group==="ANA MENÜ" :
            section.name==="PLAY" ? item.group==="OYNA" :
            section.name==="COMPETE" ? item.group==="REKABET" :
            section.name==="COMMUNITY" ? item.group==="SOSYAL" : item.group==="HESAP"
          );
          return <div className="menu-section" key={section.name}>
            <div className="menu-section-heading"><span>{section.title}</span><small>{String(groupItems.length).padStart(2,"0")}</small></div>
            {groupItems.map((item,index)=>(
              <button key={item.id} className={view===item.id?"nav-link active":"nav-link"} onClick={()=>setView(item.id)}>
                <span className="nav-icon"><item.icon size={16}/></span>
                <span className="nav-copy"><b>{item.label}</b><small>{item.id==="overview"?"Platform özeti":item.id==="matchmaking"?"Yeni maç bul":item.id==="room"?"Kodla odaya gir":item.id==="leaderboard"?"En iyi oyuncular":item.id==="teams"?"Kadronu yönet":item.id==="tournaments"?"Etkinlik takvimi":item.id==="messages"?"Sohbet kutusu":item.id==="notifications"?"Son aktiviteler":item.id==="profile"?"İstatistiklerin":"Hesap tercihleri"}</small></span>
                {view===item.id?<span className="nav-current"><i/></span>:<span className="nav-index">{String(index+1).padStart(2,"0")}</span>}
              </button>
            ))}
          </div>;
        })}
        <div className="menu-spacer"/>
        <div className="global-player">
          <div className="player-avatar">{(profile?.username||user?.email||"P").slice(0,1).toUpperCase()}</div>
          <div className="player-meta"><b>{profile?.username || (user ? "Oyuncu" : "Misafir")}</b><span className="rank-label">{user ? `RATING · ${profile?.elo ?? 1000} ELO` : "GİRİŞ YAPILMADI"}</span></div>
          <span className="player-status"><i/></span>
        </div>
        <div className="sidebar-bottom"><span className="green-dot"/> COUNTERFLAME <b>V10000</b><small>BUILT FOR COMPETITIVE PLAY</small></div>
      </aside>

      {notice && <div className="notice"><span>{notice}</span><button onClick={() => setNotice("")}><X size={16}/></button></div>}

      <div className="content-area">
      {!user ? (
        <section className="auth-layout auth-landing">
          <div className="landing-copy"><span className="landing-kicker"><span className="green-dot"/> COMPETITIVE PLATFORM · SEASON 01</span><h1>PLAY TO<br/><em>CLIMB.</em></h1><p>Build your rank. Find your squad. Own the leaderboard. CounterFlame brings your competitive matches into one focused arena.</p><div className="landing-highlights"><div><b>01</b><span>RANKED<br/>MATCHMAKING</span></div><div><b>02</b><span>PRIVATE<br/>MATCH ROOMS</span></div><div><b>03</b><span>LIVE<br/>LEADERBOARD</span></div></div><div className="landing-footnote"><Flame size={16}/> BUILT FOR THE COMPETITIVE COMMUNITY</div></div>
          <div className="auth-card auth-card-premium">
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
          <section className="main-panel">
            {view==="overview" && <>
              <div className="dashboard-topline">
                <div><span className="eyebrow">COUNTERFLAME ARENA / SEASON 01</span><h2>WELCOME BACK, {(profile?.username||"PLAYER").toUpperCase()}</h2><p>Queue up. Play smart. Climb the ladder.</p></div>
                <button className="btn-ghost compact" onClick={()=>{void loadMatches();void loadLeaderboard();}}><RefreshCw size={15}/> REFRESH DATA</button>
              </div>
              <section className="dashboard-hero">
                <div className="dashboard-hero-copy">
                  <span className="dashboard-live"><i/> COMPETITIVE QUEUE IS OPEN</span>
                  <h3>YOUR NEXT<br/><em>WIN STARTS HERE.</em></h3>
                  <p>Find a balanced match, build your record and earn your place on the leaderboard.</p>
                  <div className="dashboard-hero-actions"><button className="btn-primary" onClick={()=>setView("matchmaking")}><Swords size={16}/> FIND A MATCH <ChevronRight size={16}/></button><button className="btn-ghost" onClick={()=>setView("room")}><Users size={16}/> MATCH ROOM</button></div>
                </div>
                <div className="dashboard-hero-art" aria-hidden="true"><div className="hero-ring hero-ring-one"/><div className="hero-ring hero-ring-two"/><div className="hero-flame"><Flame size={76}/></div><span className="hero-art-label">CF / 001</span></div>
                <div className="dashboard-hero-foot"><span>RANKED MATCHMAKING</span><span>PRIVATE LOBBIES</span><span>VERIFIED RESULTS</span></div>
              </section>
              <div className="dashboard-stats">
                <div className="dashboard-stat"><span className="dashboard-stat-icon"><Trophy size={17}/></span><small>YOUR RATING</small><b>{(profile?.elo??1000).toLocaleString("tr-TR")} <i>ELO</i></b><span className="stat-note">Current player rating</span></div>
                <div className="dashboard-stat"><span className="dashboard-stat-icon"><Gamepad2 size={17}/></span><small>MATCHES PLAYED</small><b>{profile?.matches_played??0}</b><span className="stat-note">Total recorded matches</span></div>
                <div className="dashboard-stat"><span className="dashboard-stat-icon"><CheckCircle2 size={17}/></span><small>VICTORIES</small><b>{profile?.wins??0}</b><span className="stat-note">Approved match wins</span></div>
                <div className="dashboard-stat"><span className="dashboard-stat-icon"><Activity size={17}/></span><small>WIN RATE</small><b>{winRate}<i>%</i></b><span className="stat-note">Based on your record</span></div>
              </div>
              <div className="dashboard-columns">
                <section className="dashboard-section"><div className="section-heading sub-heading"><div><span className="eyebrow">FIND YOUR GAME</span><h2>PLAY YOUR WAY</h2></div></div>
                  <div className="dashboard-action-card" onClick={()=>setView("matchmaking")} role="button" tabIndex={0} onKeyDown={e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();setView("matchmaking");}}}><span className="action-card-icon"><Zap size={19}/></span><div><b>Ranked matchmaking</b><small>Find players and enter the queue</small></div><ChevronRight size={17}/></div>
                  <div className="dashboard-action-card" onClick={()=>setView("matchmaking")} role="button" tabIndex={0} onKeyDown={e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();setView("matchmaking");}}}><span className="action-card-icon"><Users size={19}/></span><div><b>Create private lobby</b><small>Invite friends with a six-digit code</small></div><ChevronRight size={17}/></div>
                  <div className="dashboard-action-card" onClick={()=>setView("leaderboard")} role="button" tabIndex={0} onKeyDown={e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();setView("leaderboard");}}}><span className="action-card-icon"><Trophy size={19}/></span><div><b>View leaderboard</b><small>See the current top competitors</small></div><ChevronRight size={17}/></div>
                </section>
                <section className="dashboard-section"><div className="section-heading sub-heading"><div><span className="eyebrow">LIVE LOBBIES</span><h2>OPEN MATCHES</h2></div><button className="text-action" onClick={()=>setView("matchmaking")}>VIEW ALL <ChevronRight size={14}/></button></div><MatchList matches={matches.slice(0,4)} onJoin={(code)=>{setJoinCode(code);setView("matchmaking");}}/></section>
              </div>
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


            {view==="teams" && <div className="panel-card real-module">
              <div className="section-heading"><div><span className="eyebrow">SQUAD MANAGEMENT</span><h2>TEAMS</h2><p>Gerçek takım kayıtları ve üye listeleri.</p></div><Users className="heading-icon"/></div>
              {myTeam ? <>
                <div className="team-identity"><div className="team-tag">{myTeam.tag}</div><div><b>{myTeam.name}</b><small>{myTeam.description || "No team description"} · {myTeam.members.length}/5 PLAYERS</small></div><span className="tag-orange">{myTeam.role.toUpperCase()}</span></div>
                <div className="team-roster">{myTeam.members.map(member=><div className="team-roster-row" key={member.user_id}><span className="profile-mini-avatar">{member.username.slice(0,1).toUpperCase()}</span><span><b>{member.username}</b><small>{member.elo} ELO</small></span><span className={member.role==="captain"?"tag-orange":"tag-muted"}>{member.role.toUpperCase()}</span></div>)}</div>
                <button className="btn-ghost" disabled={busy} onClick={leaveTeam}>LEAVE TEAM</button>
                {myTeam.role==="captain" && myTeam.members.length>1 && <p className="muted small">Captain must transfer leadership before leaving while other members remain.</p>}
              </> : <>
                <div className="team-create-form"><span className="eyebrow">CREATE YOUR SQUAD</span><input className="cf-input" placeholder="Team name (3–24 characters)" maxLength={24} value={teamName} onChange={e=>setTeamName(e.target.value)}/><input className="cf-input" placeholder="TAG (2–5 letters/numbers)" maxLength={5} value={teamTag} onChange={e=>setTeamTag(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g,""))}/><textarea className="cf-input profile-bio-input" placeholder="Team description (optional)" maxLength={240} value={teamDescription} onChange={e=>setTeamDescription(e.target.value)}/><button className="btn-primary" disabled={busy||teamName.trim().length<3||teamTag.length<2} onClick={createTeam}>CREATE TEAM <Plus size={16}/></button></div>
                <div className="section-heading sub-heading"><div><span className="eyebrow">OPEN SQUADS</span><h2>FIND A TEAM</h2></div><button className="text-action" onClick={loadTeams}><RefreshCw size={14}/> REFRESH</button></div>
                {teamDirectory.length===0?<div className="empty-list"><Users size={22}/><b>No teams yet</b><span>Create the first squad for the community.</span></div>:<div className="team-directory">{teamDirectory.map(team=><div className="team-directory-row" key={team.id}><div className="team-tag">{team.tag}</div><div><b>{team.name}</b><small>{team.description || "Competitive squad"} · {team.member_count}/5 players</small></div><button className="btn-ghost compact" disabled={busy||team.member_count>=5} onClick={()=>joinTeam(team.id)}>{team.member_count>=5?"FULL":"JOIN"}</button></div>)}</div>}
              </>}
            </div>}

            {view==="profile" && <div className="panel-card real-module">
              <div className="section-heading"><div><span className="eyebrow">PLAYER IDENTITY</span><h2>OYUNCU PROFİLİ</h2><p>Bilgilerin doğrudan CounterFlame veritabanına kaydedilir.</p></div><Activity className="heading-icon"/></div>
              <div className="profile-summary"><div className="profile-large-avatar">{(profile?.username||"P").slice(0,1).toUpperCase()}</div><div><b>{profile?.username || "Oyuncu"}</b><span>{profile?.elo ?? 1000} ELO · {profile?.matches_played ?? 0} MATCHES</span></div></div>
              <label className="field-label">PLAYER NAME</label><input className="cf-input" value={profileUsername} maxLength={20} onChange={e=>setProfileUsername(e.target.value)} />
              <label className="field-label">BIO · MAX 240 CHARACTERS</label><textarea className="cf-input profile-bio-input" value={profileBio} maxLength={240} onChange={e=>setProfileBio(e.target.value)} placeholder="Tell the community about your playstyle." />
              <button className="btn-primary" disabled={busy} onClick={saveProfile}>SAVE PROFILE <CheckCircle2 size={16}/></button>
              <div className="profile-record"><span>WINS <b>{profile?.wins ?? 0}</b></span><span>LOSSES <b>{profile?.losses ?? 0}</b></span><span>WIN RATE <b>{profile?.matches_played ? Math.round((profile.wins/profile.matches_played)*100) : 0}%</b></span></div>
            </div>}

            {view==="settings" && <div className="panel-card real-module">
              <div className="section-heading"><div><span className="eyebrow">ACCOUNT SECURITY</span><h2>HESAP AYARLARI</h2><p>Oturum ve hesap güvenliği.</p></div><ShieldCheck className="heading-icon"/></div>
              <div className="settings-row"><div><b>Signed-in account</b><small>{user.email}</small></div><span className="tag-muted">AUTHENTICATED</span></div>
              <div className="settings-row"><div><b>Database protection</b><small>Supabase Row Level Security is active on player and match data.</small></div><span className="tag-orange">RLS ON</span></div>
              <div className="settings-row"><div><b>Change password</b><small>Send a secure password reset link to your account email.</small></div><button className="btn-ghost compact" onClick={async()=>{const {error}=await supabase!.auth.resetPasswordForEmail(user.email!);setNotice(error?error.message:"Password reset email requested.");}}>SEND RESET</button></div>
              <button className="btn-ghost" onClick={signOut}><LogOut size={15}/> SIGN OUT</button>
            </div>}

            {view==="messages" && <div className="panel-card real-module dm-module">
              <div className="section-heading"><div><span className="eyebrow">PLAYER NETWORK</span><h2>DIRECT MESSAGES</h2><p>Oyuncularla bire bir sohbet. Engellenen hesaplar mesaj gönderemez.</p></div><MessageSquare className="heading-icon"/></div>
              <div className="dm-search"><input className="cf-input" value={playerSearch} onChange={e=>setPlayerSearch(e.target.value)} placeholder="Oyuncu adı ara..." onKeyDown={e=>{if(e.key==="Enter")void searchPlayers();}}/><button className="btn-primary" onClick={searchPlayers}><Search size={16}/> SEARCH</button></div>
              {playerResults.length>0 && <div className="dm-player-results">{playerResults.map(person=><button className="dm-player-result" key={person.id} onClick={()=>openDirectMessage(person)} disabled={busy}><span className="profile-mini-avatar">{person.username.slice(0,1).toUpperCase()}</span><span><b>{person.username}</b><small>{person.elo} ELO · {person.matches_played} MATCHES</small></span><Send size={15}/></button>)}</div>}
              <div className="dm-layout"><div className="dm-thread-list"><span className="eyebrow">YOUR CONVERSATIONS</span>{directThreads.length===0?<p className="muted small">Henüz sohbetin yok. Yukarıdan oyuncu ara.</p>:directThreads.map(thread=><button key={thread.conversation_id} className={activeConversation===thread.conversation_id?"dm-thread active":"dm-thread"} onClick={()=>{setActiveConversation(thread.conversation_id);setActivePeer({id:thread.peer_id,username:thread.peer_name,elo:thread.peer_elo,wins:0,losses:0,matches_played:0});}}><span className="profile-mini-avatar">{thread.peer_name.slice(0,1).toUpperCase()}</span><span><b>{thread.peer_name}</b><small>{thread.last_message}</small></span></button>)}</div>
                <div className="dm-chat"><div className="dm-chat-head"><b>{activePeer?.username || "Sohbet seç"}</b><small>{activePeer ? `PLAYER · ${activePeer.elo} ELO` : "Bir oyuncu seçerek sohbete başla."}</small></div>
                  <div className="dm-messages">{activeConversation ? directMessages.map(message=><div key={message.id} className={message.sender_id===user.id?"dm-message mine":"dm-message"}><small>{message.sender_id===user.id?"YOU":"PLAYER"} · {new Date(message.created_at).toLocaleString("tr-TR",{hour:"2-digit",minute:"2-digit"})}</small><p>{message.body}</p></div>) : <div className="chat-empty">Henüz sohbet seçilmedi.</div>}</div>
                  <form className="chat-form" onSubmit={sendDirectMessage}><input className="cf-input" value={directDraft} onChange={e=>setDirectDraft(e.target.value)} maxLength={2000} placeholder="Mesajını yaz..." disabled={!activeConversation}/><button className="btn-primary send-btn" disabled={!activeConversation||!directDraft.trim()}><Send size={16}/></button></form>
                </div></div>
            </div>}

            {["teams","tournaments","notifications"].includes(view) && <div className="panel-card feature-placeholder">
              <span className="tag-orange">ROADMAP MODULE</span>
              <h2>{navItems.find(item=>item.id===view)?.label}</h2>
              <p className="muted">Bu modüller için henüz üretim veritabanı tabloları ve güvenlik kuralları tamamlanmadı. Gerçek işlevler hazır olana kadar sahte içerik gösterilmiyor.</p>
              <div className="placeholder-status"><span className="green-dot"/> DATABASE MODULE NOT DEPLOYED</div>
            </div>}

            {isModerator && <section className="moderator-panel"><div className="section-heading"><div><span className="eyebrow">STAFF TOOLS</span><h2>RESULT REVIEW QUEUE</h2></div><ShieldCheck className="heading-icon"/></div>{pendingResults.length===0?<p className="muted">No pending match results.</p>:pendingResults.map(item=><div className="review-row" key={item.match_id}><div><b>{item.score1} : {item.score2}</b><span>Winner: Team {item.winner_team} · {new Date(item.created_at).toLocaleString("tr-TR")}</span><small>{item.match_id.slice(0,8)}…</small></div><div className="review-actions"><button className="btn-ghost compact" disabled={busy} onClick={()=>reviewResult(item.match_id,false)}>REJECT</button><button className="btn-primary compact" disabled={busy} onClick={()=>reviewResult(item.match_id,true)}><CheckCircle2 size={14}/> APPROVE</button></div></div>)}</section>}
          </section>
        </div>
      )}

      </div>

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
