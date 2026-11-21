"use client";

import { useCallback, useEffect, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import {
  Activity, Bell, CheckCircle2, ChevronRight, Clock, Copy, Flame, Gamepad2,
  LayoutDashboard, LogOut, Medal, MessageSquare, Plus, RefreshCw, Search, BrainCircuit,
  Send, ShieldCheck, Swords, Trophy, UploadCloud, Users, X, Zap, MoreHorizontal
} from "lucide-react";
import { supabase } from "@/lib/supabase";

type Profile = { id: string; username: string; elo: number; wins: number; losses: number; matches_played: number; kills?: number; deaths?: number; bio?: string | null };
type Match = { id: string; code: string; mode: string; map: string; status: string; created_at: string; created_by?: string | null };
type Player = { user_id: string; team_no: number; username: string; elo: number };
type ChatMessage = { id: string; match_id: string; sender_id: string; body: string; created_at: string };
type PendingResult = { match_id: string; winner_team: number; score1: number; score2: number; submitted_by: string; created_at: string };
type DirectThread = { conversation_id: string; peer_id: string; peer_name: string; peer_elo: number; last_message: string; updated_at: string };
type DirectMessage = { id: string; conversation_id: string; sender_id: string; body: string; created_at: string };
type TeamMember = { user_id: string; username: string; elo: number; role: string };
type TeamData = { id: string; name: string; tag: string; description: string; role: string; members: TeamMember[] };
type TeamListing = { id: string; name: string; tag: string; description: string; member_count: number };
type AppNotification = { id: string; kind: string; title: string; body: string; link: string; read_at: string | null; created_at: string };
type TournamentMatch = { id: string; round_no: number; match_no: number; player1_id: string | null; player2_id: string | null; winner_id: string | null; score1: number | null; score2: number | null; status: string };
type Tournament = { id: string; name: string; description: string; mode: string; max_players: number; status: string; created_by: string; created_at: string; entry_count: number; my_entry: boolean; matches: TournamentMatch[]; player_names: Record<string,string> };

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
  { id: "ai-analysis", label: "AI Maç Analizi", icon: BrainCircuit, group: "ARAÇLAR" },
  { id: "profile", label: "Oyuncu Profili", icon: Activity, group: "HESAP" },
  { id: "settings", label: "Ayarlar", icon: ShieldCheck, group: "HESAP" },
  { id: "admin", label: "Admin Paneli", icon: ShieldCheck, group: "HESAP" },
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
  const [appNotifications, setAppNotifications] = useState<AppNotification[]>([]);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [tournamentName, setTournamentName] = useState("");
  const [tournamentDescription, setTournamentDescription] = useState("");
  const [tournamentMode, setTournamentMode] = useState("1v1");
  const [tournamentCapacity, setTournamentCapacity] = useState("8");
  const [tournamentScores, setTournamentScores] = useState<Record<string,{score1:string;score2:string}>>({});
  const [isModerator, setIsModerator] = useState(false);
  const [adminPlayers, setAdminPlayers] = useState<Profile[]>([]);
  const [adminTargetId, setAdminTargetId] = useState("");
  const [adminElo, setAdminElo] = useState("1000");
  const [adminKills, setAdminKills] = useState("0");
  const [adminDeaths, setAdminDeaths] = useState("0");
  const [view, setView] = useState("overview");
  const [mobileMoreOpen, setMobileMoreOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [authMode, setAuthMode] = useState<"in" | "up">("in");
  const [mode, setMode] = useState("1v1");
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

  const loadNotifications = useCallback(async () => {
    if (!supabase || !user) return;
    const { data, error } = await supabase.from("cf_notifications").select("*")
      .order("created_at", { ascending: false }).limit(50);
    if (!error) setAppNotifications((data || []) as AppNotification[]);
  }, [user]);

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

  const loadAdminPlayers = useCallback(async () => {\n    if (!supabase || !isModerator) return;\n    const { data, error } = await supabase.from("profiles").select("id,username,elo,wins,losses,matches_played,kills,deaths").order("elo", { ascending: false }).limit(250);\n    if (error) { setNotice(error.message); return; }\n    const rows = (data || []) as Profile[];\n    setAdminPlayers(rows);\n    const selected = rows.find(row => row.id === adminTargetId) || rows.find(row => row.id === user?.id) || rows[0];\n    if (selected) { setAdminTargetId(selected.id); setAdminElo(String(selected.elo)); setAdminKills(String(selected.kills ?? 0)); setAdminDeaths(String(selected.deaths ?? 0)); }\n  }, [isModerator, adminTargetId, user?.id]);\n\n  const loadLeaderboard = useCallback(async () => {
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

  const loadTournaments = useCallback(async () => {
    if (!supabase || !user) return;
    const { data: rows, error } = await supabase.from("cf_tournaments").select("*").order("created_at", { ascending: false }).limit(30);
    if (error) { setNotice(error.message); return; }
    const ids = (rows || []).map((item: any) => item.id);
    if (!ids.length) { setTournaments([]); return; }
    const [{ data: entries }, { data: matches }] = await Promise.all([
      supabase.from("cf_tournament_entries").select("tournament_id,user_id").in("tournament_id", ids),
      supabase.from("cf_tournament_matches").select("*").in("tournament_id", ids).order("round_no").order("match_no")
    ]);
    const playerIds = Array.from(new Set([...(entries || []).map((e: any) => e.user_id), ...(matches || []).flatMap((m: any) => [m.player1_id,m.player2_id,m.winner_id]).filter(Boolean)]));
    const { data: people } = playerIds.length ? await supabase.from("profiles").select("id,username").in("id", playerIds) : { data: [] as any[] };
    const names: Record<string,string> = {};
    (people || []).forEach((p: any) => { names[p.id] = p.username; });
    setTournaments((rows || []).map((t: any) => {
      const ownEntries = (entries || []).filter((e: any) => e.tournament_id === t.id);
      return { ...t, entry_count: ownEntries.length, my_entry: ownEntries.some((e: any) => e.user_id === user.id), matches: (matches || []).filter((m: any) => m.tournament_id === t.id), player_names: names };
    }) as Tournament[]);
  }, [user?.id]);

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
    void loadNotifications();
    supabase?.rpc("cf_is_moderator").then(({ data }) => setIsModerator(Boolean(data)));
  }, [user, loadProfile, loadMatches, loadLeaderboard, loadConversations, loadTeams, loadNotifications]);

  useEffect(() => {
    setProfileUsername(profile?.username || "");
    setProfileBio(profile?.bio || "");
  }, [profile?.id, profile?.username, profile?.bio]);

  useEffect(() => {
    if (!user || !supabase) return;
    const channel = supabase.channel("cf-notifications-" + user.id)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "cf_notifications", filter: "user_id=eq." + user.id },
        (payload) => setAppNotifications(old => [payload.new as AppNotification, ...old.filter(item => item.id !== (payload.new as any).id)].slice(0,50)))
      .subscribe();
    return () => { void supabase?.removeChannel(channel); };
  }, [user?.id]);

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

  // Keep matchmaking alive: retry the idempotent queue RPC while waiting.
  // This lets an already-waiting player complete a match as soon as enough real players arrive.
  useEffect(() => {
    if (!user || !supabase || queueState !== "waiting") return;
    const client = supabase;
    let checking = false;
    const checkQueue = async () => {
      if (checking) return;
      checking = true;
      try {
        const { data, error } = await client.rpc("cf_join_matchmaking", { p_mode: mode });
        if (error) throw error;
        if (data?.status === "matched" && data.match_id) {
          setQueueState("");
          setNotice("Match found. Your room is ready.");
          setView("room");
          await loadMatch(data.match_id);
        } else if (data?.status === "waiting") {
          setNotice(`Searching for real players: ${data.players_found ?? 1}/${data.players_needed ?? 2}. ELO range ±${data.elo_range ?? 150}.`);
        }
      } catch (error: any) {
        setNotice(error.message || "Matchmaking connection interrupted. Retrying…");
      } finally {
        checking = false;
      }
    };
    const timer = window.setInterval(() => { void checkQueue(); }, 4000);
    return () => window.clearInterval(timer);
  }, [user?.id, queueState, mode, loadMatch]);

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

  useEffect(() => {
    if (view === "tournaments" && user) void loadTournaments();
  }, [view, user?.id, loadTournaments]);

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

  async function markNotificationsRead() {
    if (!supabase) return;
    const { error } = await supabase.rpc("cf_mark_notifications_read");
    if (error) setNotice(error.message);
    else { setAppNotifications(old => old.map(item => ({ ...item, read_at: item.read_at || new Date().toISOString() }))); }
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

  async function createTournament() {
    if (!supabase || !user) return;
    setBusy(true);
    const { data, error } = await supabase.from("cf_tournaments").insert({
      name: tournamentName.trim(), description: tournamentDescription.trim(),
      mode: tournamentMode, max_players: Number(tournamentCapacity), created_by: user.id
    }).select("id").single();
    if (error) setNotice(error.message);
    else {
      const joined = await supabase.rpc("cf_join_tournament", { p_tournament: data.id });
      setTournamentName(""); setTournamentDescription("");
      setNotice(joined.error ? joined.error.message : "Turnuva oluşturuldu. İlk oyuncu olarak kaydoldun.");
      await loadTournaments();
    }
    setBusy(false);
  }

  async function joinTournament(id: string) {
    if (!supabase) return;
    setBusy(true);
    const { error } = await supabase.rpc("cf_join_tournament", { p_tournament: id });
    setNotice(error ? error.message : "Turnuvaya katıldın.");
    await loadTournaments(); setBusy(false);
  }

  async function leaveTournament(id: string) {
    if (!supabase) return;
    setBusy(true);
    const { error } = await supabase.rpc("cf_leave_tournament", { p_tournament: id });
    setNotice(error ? error.message : "Turnuvadan ayrıldın.");
    await loadTournaments(); setBusy(false);
  }

  async function startTournament(id: string) {
    if (!supabase) return;
    setBusy(true);
    const { error } = await supabase.rpc("cf_start_tournament", { p_tournament: id });
    setNotice(error ? error.message : "Turnuva başladı. İlk tur eşleşmeleri hazır.");
    await loadTournaments(); setBusy(false);
  }

  async function submitTournamentResult(match: TournamentMatch) {
    if (!supabase || !match.player1_id || !match.player2_id) return;
    const values = tournamentScores[match.id] || { score1: "13", score2: "8" };
    const a = Number(values.score1), b = Number(values.score2);
    if (!Number.isInteger(a) || !Number.isInteger(b) || a < 0 || b < 0 || a > 99 || b > 99 || a === b) {
      setNotice("Geçerli ve birbirinden farklı iki skor gir.");
      return;
    }
    setBusy(true);
    const { error } = await supabase.rpc("cf_report_tournament_result", {
      p_match: match.id, p_winner: a > b ? match.player1_id : match.player2_id, p_score1: a, p_score2: b
    });
    setNotice(error ? error.message : "Sonuç kaydedildi; sonraki tur otomatik oluşturuldu.");
    await loadTournaments();
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

  async function saveAdminStats() {
    if (!supabase || !isModerator || !adminTargetId) return;
    const eloValue = Number(adminElo), killsValue = Number(adminKills), deathsValue = Number(adminDeaths);
    if (![eloValue,killsValue,deathsValue].every(Number.isInteger) || eloValue < 0 || eloValue > 10000 || killsValue < 0 || deathsValue < 0 || killsValue > 999999 || deathsValue > 999999) {
      setNotice("ELO 0–10000, K/D ise 0–999999 aralığında tam sayı olmalı."); return;
    }
    setBusy(true);
    const { data, error } = await supabase.rpc("cf_admin_update_player_stats", {
      p_user_id: adminTargetId, p_elo: eloValue, p_kills: killsValue, p_deaths: deathsValue
    });
    if (error) setNotice(error.message);
    else {
      setNotice("Oyuncu istatistikleri güncellendi.");
      setAdminPlayers(old => old.map(row => row.id === adminTargetId ? { ...row, elo: data.elo, kills: data.kills, deaths: data.deaths } : row));
      if (adminTargetId === user.id) await loadProfile(user.id);
      await loadLeaderboard();
    }
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
        <a className="brand" href="#"><span className="brand-mark"><Flame size={22}/></span><span><b>COUNTERFLAME <em>FACEIT</em> <span className="brand-version">v1.0.0</span></b><small>COMPETITIVE COMMUNITY PLATFORM</small></span></a>
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
          const groupItems = navItems.filter(item => (item.id !== "admin" || isModerator) && (
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
                <span className="nav-copy"><b>{item.label}</b><small>{item.id==="overview"?"Platform özeti":item.id==="matchmaking"?"Yeni maç bul":item.id==="room"?"Kodla odaya gir":item.id==="leaderboard"?"En iyi oyuncular":item.id==="teams"?"Kadronu yönet":item.id==="tournaments"?"Etkinlik takvimi":item.id==="messages"?"Sohbet kutusu":item.id==="notifications"?"Son aktiviteler":item.id==="ai-analysis"?"Ekran görüntüsü inceleme":item.id==="profile"?"İstatistiklerin":item.id==="admin"?"Yetkili yönetimi":"Hesap tercihleri"}</small></span>
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
        <div className="sidebar-bottom"><span className="green-dot"/> COUNTERFLAME <b>V5000</b><small>BUILT FOR COMPETITIVE PLAY</small></div>
      </aside>

      <nav className="mobile-dock" aria-label="Mobil ana menü">
        {["overview","matchmaking","room","leaderboard","profile"].map(id => {
          const item = navItems.find(entry => entry.id === id)!;
          return <button key={id} className={view===id?"mobile-dock-item active":"mobile-dock-item"} onClick={()=>{setView(id);setMobileMoreOpen(false);}}>
            <item.icon size={19}/><span>{id==="overview"?"Ana Sayfa":id==="matchmaking"?"Eşleş":id==="room"?"Oda":id==="leaderboard"?"Sıralama":"Profil"}</span>
          </button>;
        })}
        <button className={mobileMoreOpen?"mobile-dock-item active":"mobile-dock-item"} onClick={()=>setMobileMoreOpen(open=>!open)} aria-expanded={mobileMoreOpen}>
          <MoreHorizontal size={20}/><span>Daha Fazla</span>
        </button>
      </nav>
      {mobileMoreOpen && <div className="mobile-more-panel">
        <div className="mobile-more-heading"><b>Diğer bölümler</b><button onClick={()=>setMobileMoreOpen(false)} aria-label="Menüyü kapat"><X size={18}/></button></div>
        {navItems.filter(item=>!["overview","matchmaking","room","leaderboard","profile"].includes(item.id)).map(item=>
          <button key={item.id} className={view===item.id?"mobile-more-link active":"mobile-more-link"} onClick={()=>{setView(item.id);setMobileMoreOpen(false);}}>
            <item.icon size={17}/><span>{item.label}</span><ChevronRight size={15}/>
          </button>
        )}
      </div>}

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
          <section key={view} className="main-panel liquid-page-transition">
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
                <section className="dashboard-section room-shortcut"><div className="section-heading sub-heading"><div><span className="eyebrow">YOUR MATCH SPACE</span><h2>MAÇ ODAN</h2></div><Gamepad2 size={18}/></div><p className="muted">Eşleşmen bulunduğunda oda otomatik açılır. Takım kadrosu ve sohbet tek yerde görünür.</p><button className="btn-ghost full" onClick={()=>setView("room")}>ODAMI AÇ <ChevronRight size={15}/></button></section>
              </div>
              <Leaderboard rows={leaderboard.slice(0,5)}/>
            </>}

            {view==="matchmaking" && <>
              <div className="section-heading"><div><span className="eyebrow">COMPETITIVE QUEUE</span><h2>MATCHMAKING</h2><p>Modunu seç. Sistem gerçek oyuncuları otomatik eşleştirir; davet kodu gerekmez.</p></div><Swords className="heading-icon"/></div>
              <div className="matchmaking-grid">
                <div className="panel-card"><div className="card-top"><span className="tag-orange">RANKED SEARCH</span><Zap size={19}/></div><h3>FIND A MATCH</h3><p className="muted">Gerçek oyuncular aynı mod ve yakın ELO aralığında otomatik eşleşir. Başlangıç modu 1v1.</p><label className="field-label">GAME MODE</label><div className="mode-grid">{modes.map(item=><button key={item} className={mode===item?"mode-option selected":"mode-option"} onClick={()=>setMode(item)}>{item}</button>)}</div><button className="btn-primary full" disabled={busy} onClick={joinQueue}>{queueState==="waiting"?"OYUNCU ARANIYOR…":"OTOMATİK EŞLEŞMEYİ BAŞLAT"} <ChevronRight size={16}/></button>{queueState==="waiting"&&<><div className="cf-search-loader" role="status" aria-live="polite"><div className="cf-loader-ring"><div className="cf-loader-core">CF</div></div><b>RAKİP ARANIYOR</b><span>Uygun oyuncu bulunduğunda otomatik eşleşeceksin.</span><i className="cf-loader-pulse"/></div><button className="btn-ghost full mt-2" onClick={leaveQueue}>ARAMAYI İPTAL ET</button></>}</div>
              </div>
            </>}

            {view==="ai-analysis" && <div className="panel-card real-module ai-analysis-page">
              <div className="section-heading"><div><span className="eyebrow">COUNTERFLAME INTELLIGENCE</span><h2>AI MAÇ ANALİZİ</h2><p>Maç ekran görüntülerini tek bir yerde topla. AI motoru bağlandığında skor, oyuncu isimleri ve kanıt tutarlılığı burada incelenecek.</p></div><BrainCircuit className="heading-icon"/></div>
              <div className="ai-status-strip"><span className="ai-status-dot"/><div><b>AI MOTORU BEKLEMEDE</b><small>Otomatik görüntü analizi servisi henüz projeye bağlanmadı. Şu an AI sonucu veya skor üretmiyoruz.</small></div></div>
              <div className="ai-upload-zone"><div className="ai-upload-icon"><UploadCloud size={25}/></div><b>MAÇ EKRAN GÖRÜNTÜSÜ</b><span>JPG, PNG veya WebP · En fazla 10 MB</span><input className="cf-input file-input" type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>setEvidenceFile(e.target.files?.[0]||null)}/><button className="btn-primary full" disabled={!activeMatch||!evidenceFile||busy} onClick={uploadEvidence}>{busy?"YÜKLENİYOR…":"KANITI MAÇA YÜKLE"} <ChevronRight size={16}/></button>{!activeMatch&&<small>Kanıt yüklemek için önce bir maç eşleşmesine katılmalısın.</small>}</div>
              <div className="ai-analysis-steps"><div><span>01</span><b>Görseli yükle</b><small>Maç ekran görüntüsünü seç.</small></div><div><span>02</span><b>AI doğrulaması</b><small>AI bağlantısı tamamlandığında açılacak.</small></div><div><span>03</span><b>Sonuç kontrolü</b><small>Doğrulanan sonuçlar moderatör onayına gider.</small></div></div>
            </div>}
            {view==="leaderboard" && <><div className="section-heading"><div><span className="eyebrow">SEASON 01</span><h2>GLOBAL LEADERBOARD</h2><p>Rankings include only moderator-approved match results.</p></div><Trophy className="heading-icon"/></div><Leaderboard rows={leaderboard}/></>}

            {view==="room" && <>{activeMatch ? <MatchRoom match={activeMatch} players={players} messages={messages} userId={user.id} draft={draft} setDraft={setDraft} onSend={sendMessage}/> : <div className="panel-card room-empty-premium"><div className="room-orbit"><div className="room-orbit-ring room-orbit-ring-a"/><div className="room-orbit-ring room-orbit-ring-b"/><div className="room-orbit-core">CF</div><i className="room-orbit-point"/></div><span className="eyebrow">COUNTERFLAME / MATCH SPACE</span><h3>ODA HAZIR</h3><p>Henüz aktif bir eşleşmen yok. Eşleşme tamamlandığında oyuncuların ve maç sohbetin burada açılacak.</p><button className="btn-primary" onClick={()=>setView("matchmaking")}><Swords size={16}/> EŞLEŞME BUL</button><small>ÖZEL LOBİ KARIŞIKLIĞI YOK · OTOMATİK ODA</small></div>}</>}


            {view==="teams" && <div className="panel-card real-module">
              <div className="section-heading"><div><span className="eyebrow">OYUNCU KADROSU</span><h2>TAKIMLAR</h2><p>Arkadaşlarınla kalıcı bir oyuncu kadrosu kur. Takım kurmak eşleşmeye katılmak için zorunlu değil.</p></div><Users className="heading-icon"/></div>
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
              {isModerator ? <div className="admin-settings-entry"><div className="admin-entry-icon"><ShieldCheck size={19}/></div><div><b>ADMIN PANELİ</b><small>ELO ve oyuncu istatistiklerini yönet.</small></div><button className="btn-primary compact" onClick={()=>setView("admin")}>AÇ <ChevronRight size={14}/></button></div> : <div className="settings-row"><div><b>Yönetici araçları</b><small>Admin paneli yalnızca yetkilendirilmiş hesaplarda görünür.</small></div><span className="tag-muted">KİLİTLİ</span></div>}
              <button className="btn-ghost" onClick={signOut}><LogOut size={15}/> SIGN OUT</button>
            </div>}

            {view==="admin" && <div className="panel-card real-module admin-page">
              <div className="section-heading"><div><span className="eyebrow">COUNTERFLAME CONTROL</span><h2>ADMIN PANELİ</h2><p>Kendi hesabın dahil oyuncuların ELO ve K/D istatistiklerini yönet.</p></div><ShieldCheck className="heading-icon"/></div>
              {!isModerator ? <div className="empty-list"><ShieldCheck size={24}/><b>Yetki gerekli</b><span>Bu alan yalnızca CounterFlame yöneticilerine açıktır.</span></div> : <>
                <div className="admin-warning"><ShieldCheck size={17}/><span>Yönetici işlemleri sunucu tarafında yetki kontrolünden geçer. Herkes bu değerleri değiştiremez.</span></div>
                <div className="admin-stat-strip"><div><small>OYUNCU SAYISI</small><b>{adminPlayers.length}</b></div><div><small>SEÇİLİ HESAP</small><b>{adminPlayers.find(p=>p.id===adminTargetId)?.username || "—"}</b></div><div><small>YETKİ</small><b>ADMIN</b></div></div>
                <label className="field-label">OYUNCU SEÇ · KENDİNİ DE SEÇEBİLİRSİN</label>
                <select className="cf-input admin-select" value={adminTargetId} onChange={e=>{const id=e.target.value;const p=adminPlayers.find(row=>row.id===id);setAdminTargetId(id);if(p){setAdminElo(String(p.elo));setAdminKills(String(p.kills??0));setAdminDeaths(String(p.deaths??0));}}}>
                  {adminPlayers.map(p=><option key={p.id} value={p.id}>{p.username} · {p.elo} ELO</option>)}
                </select>
                <div className="admin-edit-grid">
                  <label><span>ELO PUANI</span><input className="cf-input" type="number" min="0" max="10000" value={adminElo} onChange={e=>setAdminElo(e.target.value)}/></label>
                  <label><span>KILLS</span><input className="cf-input" type="number" min="0" max="999999" value={adminKills} onChange={e=>setAdminKills(e.target.value)}/></label>
                  <label><span>DEATHS</span><input className="cf-input" type="number" min="0" max="999999" value={adminDeaths} onChange={e=>setAdminDeaths(e.target.value)}/></label>
                  <div className="admin-kd-preview"><small>K/D ORANI</small><b>{Number(adminDeaths)>0?(Number(adminKills)/Number(adminDeaths)).toFixed(2):Number(adminKills)>0?"∞":"0.00"}</b></div>
                </div>
                <button className="btn-primary full" disabled={busy||!adminTargetId} onClick={saveAdminStats}>İSTATİSTİKLERİ KAYDET <CheckCircle2 size={16}/></button>
                <div className="admin-player-list"><div className="card-top"><b>OYUNCU LİSTESİ</b><button className="text-action" onClick={()=>void loadAdminPlayers()}><RefreshCw size={14}/> YENİLE</button></div>
                  {adminPlayers.map(p=><button key={p.id} className={adminTargetId===p.id?"admin-player-row selected":"admin-player-row"} onClick={()=>{setAdminTargetId(p.id);setAdminElo(String(p.elo));setAdminKills(String(p.kills??0));setAdminDeaths(String(p.deaths??0));}}><span><b>{p.username}{p.id===user.id?" · SEN":""}</b><small>{p.wins}G / {p.losses}M · {p.matches_played} maç · K/D {p.kills??0}/{p.deaths??0}</small></span><strong>{p.elo.toLocaleString()} ELO</strong></button>)}
                </div>
              </>}
            </div>}
            {view==="notifications" && <div className="panel-card real-module">
              <div className="section-heading"><div><span className="eyebrow">ACCOUNT ACTIVITY</span><h2>BİLDİRİMLER</h2><p>Mesajlar, takım hareketleri ve maç kararları.</p></div><Bell className="heading-icon"/></div>
              <div className="notification-toolbar"><span>{appNotifications.filter(item=>!item.read_at).length} UNREAD</span><button className="btn-ghost compact" disabled={!appNotifications.some(item=>!item.read_at)} onClick={markNotificationsRead}>MARK ALL READ <CheckCircle2 size={14}/></button></div>
              {appNotifications.length===0?<div className="empty-list"><Bell size={22}/><b>No notifications yet</b><span>New messages and match updates will appear here.</span></div>:<div className="notification-list">{appNotifications.map(item=><button key={item.id} className={item.read_at?"notification-row":"notification-row unread"} onClick={()=>{setView(item.link==="teams"?"teams":item.link==="messages"?"messages":"room");if(!item.read_at){void markNotificationsRead();}}}><span className="notification-icon">{item.kind==="direct_message"?<MessageSquare size={16}/>:item.kind==="team_join"?<Users size={16}/>:<Trophy size={16}/>}</span><span className="notification-copy"><b>{item.title}</b><small>{item.body}</small><time>{new Date(item.created_at).toLocaleString("tr-TR")}</time></span>{!item.read_at&&<i className="notification-unread-dot"/>}</button>)}</div>}
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

            {view==="tournaments" && <div className="panel-card real-module">
              <div className="section-heading"><div><span className="eyebrow">COMPETITIVE EVENTS</span><h2>TURNUVALAR</h2><p>Gerçek kayıtlar, oyuncu kontenjanı ve ilk tur eşleşmeleri.</p></div><Medal className="heading-icon"/></div>
              <div className="team-create-form">
                <span className="eyebrow">YENİ TURNUVA OLUŞTUR</span>
                <input className="cf-input" value={tournamentName} onChange={e=>setTournamentName(e.target.value)} maxLength={48} placeholder="Turnuva adı (3–48 karakter)"/>
                <textarea className="cf-input profile-bio-input" value={tournamentDescription} onChange={e=>setTournamentDescription(e.target.value)} maxLength={300} placeholder="Açıklama (isteğe bağlı)"/>
                <div className="result-controls">
                  <select className="cf-input" value={tournamentMode} onChange={e=>setTournamentMode(e.target.value)}><option value="1v1">1v1 · Bireysel</option></select>
                  <select className="cf-input" value={tournamentCapacity} onChange={e=>setTournamentCapacity(e.target.value)}><option value="4">4 oyuncu</option><option value="8">8 oyuncu</option><option value="16">16 oyuncu</option><option value="32">32 oyuncu</option></select>
                </div>
                <button className="btn-primary" disabled={busy||tournamentName.trim().length<3} onClick={createTournament}>TURNUVA OLUŞTUR <Plus size={16}/></button>
              </div>
              <div className="section-heading sub-heading"><div><span className="eyebrow">LIVE REGISTRATION</span><h2>AÇIK TURNUVALAR</h2></div><button className="text-action" onClick={()=>void loadTournaments()}><RefreshCw size={14}/> YENİLE</button></div>
              {tournaments.length===0 ? <div className="empty-list"><Medal size={22}/><b>Henüz turnuva yok</b><span>İlk turnuvayı sen oluşturabilirsin.</span></div> : <div className="team-directory">
                {tournaments.map(t=><article className="panel-card" key={t.id} style={{marginBottom:10}}>
                  <div className="card-top"><span className="tag-orange">{t.status.toUpperCase()}</span><span className="tag-muted">{t.mode} · {t.max_players} SLOT</span></div>
                  <h3>{t.name}</h3><p className="muted small">{t.description || "CounterFlame community tournament"}</p>
                  <div className="profile-record"><span>KATILIM <b>{t.entry_count}/{t.max_players}</b></span><span>MOD <b>{t.mode}</b></span><span>OLUŞTURAN <b>{t.created_by===user.id?"SEN":(t.player_names[t.created_by]||"Oyuncu")}</b></span></div>
                  {t.status==="registration" && <div className="review-actions" style={{marginTop:12}}>
                    {t.created_by===user.id ? <button className="btn-primary compact" disabled={busy||t.entry_count!==t.max_players} onClick={()=>startTournament(t.id)}>TURNUVAYI BAŞLAT</button> : t.my_entry ? <button className="btn-ghost compact" disabled={busy} onClick={()=>leaveTournament(t.id)}>AYRIL</button> : <button className="btn-primary compact" disabled={busy||t.entry_count>=t.max_players} onClick={()=>joinTournament(t.id)}>KATIL</button>}
                    <span className="muted small">{t.entry_count===t.max_players?"Kontenjan doldu":`${t.max_players-t.entry_count} boş yer`}</span>
                  </div>}
                  {t.matches.length>0 && <div className="team-roster">{t.matches.map(m=><div className="team-roster-row" key={m.id} style={{alignItems:"flex-start",flexWrap:"wrap"}}><span className="tag-orange">R{m.round_no} · M{m.match_no}</span><span style={{flex:1,minWidth:150}}><b>{m.player1_id?(t.player_names[m.player1_id]||"Oyuncu"):"TBD"} vs {m.player2_id?(t.player_names[m.player2_id]||"Oyuncu"):"TBD"}</b><small>{m.status==="completed"?`SONUÇ ${m.score1} : ${m.score2} · KAZANAN ${t.player_names[m.winner_id||""]||"Oyuncu"}`:"MAÇ BEKLİYOR"}</small></span>
                    {m.status==="scheduled" && (m.player1_id===user.id||m.player2_id===user.id) && <div className="review-actions"><input className="cf-input" style={{width:65}} type="number" min="0" max="99" aria-label="Skor 1" value={(tournamentScores[m.id]||{score1:"13",score2:"8"}).score1} onChange={e=>setTournamentScores(old=>({...old,[m.id]:{...(old[m.id]||{score1:"13",score2:"8"}),score1:e.target.value}}))}/><input className="cf-input" style={{width:65}} type="number" min="0" max="99" aria-label="Skor 2" value={(tournamentScores[m.id]||{score1:"13",score2:"8"}).score2} onChange={e=>setTournamentScores(old=>({...old,[m.id]:{...(old[m.id]||{score1:"13",score2:"8"}),score2:e.target.value}}))}/><button className="btn-primary compact" disabled={busy} onClick={()=>submitTournamentResult(m)}>SONUCU GÖNDER</button></div>}
                  </div>)}</div>}
                </article>)}
              </div>}
            </div>}

            {isModerator && <section className="moderator-panel"><div className="section-heading"><div><span className="eyebrow">STAFF TOOLS</span><h2>RESULT REVIEW QUEUE</h2></div><ShieldCheck className="heading-icon"/></div>{pendingResults.length===0?<p className="muted">No pending match results.</p>:pendingResults.map(item=><div className="review-row" key={item.match_id}><div><b>{item.score1} : {item.score2}</b><span>Winner: Team {item.winner_team} · {new Date(item.created_at).toLocaleString("tr-TR")}</span><small>{item.match_id.slice(0,8)}…</small></div><div className="review-actions"><button className="btn-ghost compact" disabled={busy} onClick={()=>reviewResult(item.match_id,false)}>REJECT</button><button className="btn-primary compact" disabled={busy} onClick={()=>reviewResult(item.match_id,true)}><CheckCircle2 size={14}/> APPROVE</button></div></div>)}</section>}
          </section>
        </div>
      )}

      </div>

      <footer className="footer"><span>COUNTERFLAME <b>FACEIT</b> · V5000 UI EDITION</span><span>COMMUNITY PROJECT · NOT AFFILIATED WITH ANY GAME PUBLISHER</span></footer>
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

function MatchRoom({match,players,messages,userId,draft,setDraft,onSend}:{
  match:Match;players:Player[];messages:ChatMessage[];userId:string;draft:string;setDraft:(v:string)=>void;onSend:(e:FormEvent)=>void;
}) {
  return <><div className="section-heading"><div><span className="eyebrow">LIVE MATCH SPACE</span><h2>MAÇ ODASI</h2><p>Takım kadroları ve maç sohbeti. Kanıt yükleme ayrı AI Analiz bölümünde.</p></div><span className="tag-orange">{match.status.toUpperCase()}</span></div>
    <div className="room-grid"><div className="panel-card room-main"><div className="room-meta"><div><small>OYUN MODU</small><b>{match.mode}</b></div><div><small>HARİTA</small><b>{match.map}</b></div><div><small>OYUNCULAR</small><b>{players.length} / {Number(match.mode[0])*2}</b></div></div><div className="teams"><div><span className="team-title">1. TARAF · MAVİ</span>{players.filter(p=>p.team_no===1).map(p=><div className="team-player" key={p.user_id}><span className="player-dot"/><b>{p.username}{p.user_id===userId?" (SEN)":""}</b><small>{p.elo} ELO</small></div>)}</div><div><span className="team-title team-two">2. TARAF · TURUNCU</span>{players.filter(p=>p.team_no===2).map(p=><div className="team-player" key={p.user_id}><span className="player-dot alt"/><b>{p.username}{p.user_id===userId?" (SEN)":""}</b><small>{p.elo} ELO</small></div>)}</div></div><p className="room-side-note">Bunlar yalnızca bu maçın iki tarafıdır. Takımlar menüsü ise kalıcı oyuncu kadrosu kurmak içindir.</p><div className="room-ai-link"><BrainCircuit size={18}/><div><b>Maç kanıtı mı ekleyeceksin?</b><small>AI Maç Analizi bölümünden ekran görüntüsü yükleyebilirsin.</small></div></div></div>
      <div className="panel-card chat-card"><div className="card-top"><div><span className="eyebrow">TAKIM İLETİŞİMİ</span><h3>MAÇ SOHBETİ</h3></div><MessageSquare size={19}/></div><div className="chat-messages">{messages.length===0?<div className="chat-empty">Henüz mesaj yok.<br/>Sohbeti başlat.</div>:messages.map(message=><div className={message.sender_id===userId?"chat-message mine":"chat-message"} key={message.id}><small>{message.sender_id===userId?"SEN":"OYUNCU"} · {new Date(message.created_at).toLocaleTimeString("tr-TR",{hour:"2-digit",minute:"2-digit"})}</small><p>{message.body}</p></div>)}</div><form className="chat-form" onSubmit={onSend}><input className="cf-input" value={draft} onChange={e=>setDraft(e.target.value)} maxLength={1000} placeholder="Mesaj yaz…"/><button className="btn-primary send-btn" disabled={!draft.trim()}><Send size={16}/></button></form></div></div></>;
}
