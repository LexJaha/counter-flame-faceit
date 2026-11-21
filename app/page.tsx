"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Flame, Trophy, Swords, Users, MessageSquare, ShieldCheck, Plus, LogOut, Copy, UploadCloud } from "lucide-react";

type Match = { id: string; code: string; mode: string; map: string; status: string; host_id: string };
type Msg = { id: string; body: string; created_at: string; sender_id: string };
const maps = ["Random", "Harbor", "Factory", "Outpost", "District"];
const newCode = () => String(Math.floor(100000 + Math.random() * 900000));

export default function Home() {
  const [session, setSession] = useState<any>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [matches, setMatches] = useState<Match[]>([]);
  const [active, setActive] = useState<Match | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [draft, setDraft] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [mode, setMode] = useState("5v5");
  const [map, setMap] = useState("Random");
  const [proofUrl, setProofUrl] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const user = session?.user;
  const configured = !!supabase;

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, value) => setSession(value));
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => { if (user) void loadMatches(); }, [user]);

  useEffect(() => {
    if (!active || !supabase) return;
    void loadMessages(active.id);
    const channel = supabase.channel("chat-" + active.id)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "match_messages", filter: "match_id=eq." + active.id },
        payload => setMessages(old => old.some(item => item.id === payload.new.id) ? old : [...old, payload.new as Msg]))
      .subscribe();
    return () => { void supabase?.removeChannel(channel); };
  }, [active?.id]);

  async function loadMatches() {
    if (!supabase) return;
    const { data, error } = await supabase.from("matches").select("*").in("status", ["open", "live"]).order("created_at", { ascending: false }).limit(30);
    if (error) setNotice(error.message); else setMatches((data || []) as Match[]);
  }
  async function loadMessages(id: string) {
    if (!supabase) return;
    const { data, error } = await supabase.from("match_messages").select("*").eq("match_id", id).order("created_at").limit(100);
    if (error) setNotice(error.message); else setMessages((data || []) as Msg[]);
  }
  async function auth(kind: "in" | "up") {
    if (!supabase) return;
    setBusy(true);
    try {
      const result = kind === "up"
        ? await supabase.auth.signUp({ email, password, options: { data: { username } } })
        : await supabase.auth.signInWithPassword({ email, password });
      if (result.error) throw result.error;
      setNotice(kind === "up" && !result.data.session ? "Kayıt oluşturuldu. E-posta doğrulaması gerekiyorsa gelen kutunu kontrol et." : "Giriş başarılı.");
    } catch (error: any) { setNotice(error.message || "İşlem başarısız."); }
    finally { setBusy(false); }
  }
  async function createMatch() {
    if (!supabase || !user) return;
    setBusy(true);
    try {
      let code = newCode();
      for (let i = 0; i < 5; i++) {
        const { data } = await supabase.from("matches").select("id").eq("code", code).maybeSingle();
        if (!data) break;
        code = newCode();
      }
      const { data, error } = await supabase.from("matches").insert({ code, mode, map, host_id: user.id }).select().single();
      if (error) throw error;
      const { error: joinError } = await supabase.from("match_players").insert({ match_id: data.id, user_id: user.id, team: "A" });
      if (joinError) throw joinError;
      setActive(data as Match); setNotice("Lobi oluşturuldu. Match Code: " + code); await loadMatches();
    } catch (error: any) { setNotice(error.message); }
    finally { setBusy(false); }
  }
  async function joinMatch() {
    if (!supabase || !user) return;
    setBusy(true);
    try {
      const { data, error } = await supabase.from("matches").select("*").eq("code", joinCode.trim()).eq("status", "open").single();
      if (error || !data) throw new Error("Açık lobi bulunamadı.");
      const { error: joinError } = await supabase.from("match_players").upsert({ match_id: data.id, user_id: user.id, team: "B" }, { onConflict: "match_id,user_id" });
      if (joinError) throw joinError;
      setActive(data as Match); setNotice("Lobiye katıldın.");
    } catch (error: any) { setNotice(error.message); }
    finally { setBusy(false); }
  }
  async function sendMessage() {
    if (!supabase || !user || !active || !draft.trim()) return;
    const body = draft.trim(); setDraft("");
    const { error } = await supabase.from("match_messages").insert({ match_id: active.id, sender_id: user.id, body });
    if (error) setNotice(error.message);
  }
  async function submitEvidence() {
    if (!supabase || !user || !active || !proofUrl.startsWith("https://")) return;
    const { error } = await supabase.from("match_evidence").insert({ match_id: active.id, submitted_by: user.id, image_url: proofUrl, note: "Screenshot evidence" });
    if (error) setNotice(error.message); else setNotice("Kanıt gönderildi. Yetkili incelemesi bekleniyor.");
    setProofUrl("");
  }
  async function signOut() { await supabase?.auth.signOut(); setActive(null); setMatches([]); }

  return <main className="min-h-screen">
    <header className="sticky top-0 z-20 border-b border-white/10 bg-[#090a0c]/90 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
        <div className="flex items-center gap-3"><div className="rounded-xl bg-[#ff6a2a] p-2 text-black"><Flame size={22}/></div><div><div className="font-black tracking-[.14em]">COUNTERFLAME <span className="text-[#ff6a2a]">FACEIT</span></div><div className="text-[10px] tracking-[.2em] text-zinc-500">COMMUNITY COMPETITIVE PLATFORM</div></div></div>
        {user ? <div className="flex items-center gap-3"><span className="text-sm">{user.user_metadata?.username || user.email}</span><button className="secondary p-2" onClick={signOut}><LogOut size={16}/></button></div> : <span className="tag">BETA ACCESS</span>}
      </div>
    </header>
    <div className="mx-auto max-w-7xl px-4 py-8">
      <section className="mb-8 overflow-hidden rounded-3xl border border-orange-500/20 bg-gradient-to-br from-[#21130e] via-[#141316] to-[#0d0e11] p-7 md:p-10">
        <span className="tag">SEASON 01 · COMMUNITY BETA</span>
        <h1 className="mt-5 text-4xl font-black leading-tight md:text-6xl">PLAY TO <span className="text-[#ff6a2a]">PROVE.</span><br/>CLIMB THE RANKS.</h1>
        <p className="mt-4 max-w-xl text-sm leading-6 text-zinc-400">CounterFlame topluluğu için rekabetçi maç lobileri, oyuncu eşleşmeleri ve kanıt tabanlı sonuç incelemesi.</p>
        <a href="#matchmaking" className="primary mt-6 inline-flex">Maç bul →</a>
      </section>
      <div className="mb-8 grid grid-cols-2 gap-3 md:grid-cols-4">
        {[{icon:<Swords/>,label:"MATCHMAKING",value:"5v5 / 1v1"},{icon:<Users/>,label:"COMMUNITY",value:"Player lobbies"},{icon:<Trophy/>,label:"RANKING",value:"ELO ready"},{icon:<ShieldCheck/>,label:"VERIFICATION",value:"Evidence review"}].map((item,index)=><div key={index} className="glass rounded-2xl p-4"><div className="mb-3 text-[#ff7845]">{item.icon}</div><div className="text-[10px] font-bold tracking-widest text-zinc-500">{item.label}</div><div className="mt-1 text-sm font-bold">{item.value}</div></div>)}
      </div>
      {!configured && <div className="glass mb-8 rounded-2xl border-orange-500/30 p-5"><b className="text-orange-300">Supabase kurulumu gerekli</b><p className="mt-2 text-sm text-zinc-400">README adımlarını tamamlayıp .env.local dosyasına Supabase URL ve anon key ekle. Ardından giriş ve veritabanı özellikleri çalışır.</p></div>}
      {notice && <div className="mb-5 rounded-xl border border-orange-500/30 bg-orange-500/10 px-4 py-3 text-sm text-orange-200">{notice}</div>}
      {!user ? <section className="glass mx-auto mb-10 max-w-xl rounded-2xl p-6">
        <div className="mb-5 flex items-center gap-2"><ShieldCheck className="text-[#ff6a2a]"/><h2 className="text-xl font-black">PLAYER ACCESS</h2></div>
        <div className="space-y-3"><input className="field" placeholder="Oyuncu adı (kayıt için)" value={username} onChange={e=>setUsername(e.target.value)}/><input className="field" type="email" placeholder="E-posta" value={email} onChange={e=>setEmail(e.target.value)}/><input className="field" type="password" placeholder="Şifre" value={password} onChange={e=>setPassword(e.target.value)}/><div className="grid grid-cols-2 gap-3"><button disabled={!configured||busy||!email||password.length<6} className="primary disabled:opacity-40" onClick={()=>auth("in")}>Giriş yap</button><button disabled={!configured||busy||!email||password.length<6||!username.trim()} className="secondary disabled:opacity-40" onClick={()=>auth("up")}>Kayıt ol</button></div></div>
      </section> : <section id="matchmaking" className="mb-10 grid gap-5 lg:grid-cols-2">
        <div className="glass rounded-2xl p-6"><div className="mb-5 flex items-center justify-between"><h2 className="text-xl font-black">MATCHMAKING</h2><span className="tag">QUEUE OPEN</span></div>
          <label className="mb-2 block text-xs text-zinc-400">GAME MODE</label><div className="mb-4 grid grid-cols-2 gap-2">{["5v5","1v1"].map(value=><button key={value} onClick={()=>setMode(value)} className={mode===value?"primary":"secondary"}>{value}</button>)}</div>
          <label className="mb-2 block text-xs text-zinc-400">MAP POOL</label><select className="field mb-5" value={map} onChange={e=>setMap(e.target.value)}>{maps.map(value=><option key={value}>{value}</option>)}</select>
          <button disabled={!configured||busy} className="primary flex w-full items-center justify-center gap-2 disabled:opacity-40" onClick={createMatch}><Plus size={17}/> Create match lobby</button>
          <div className="my-5 text-center text-xs text-zinc-500">OR JOIN WITH CODE</div><div className="flex gap-2"><input className="field text-center font-mono tracking-[.3em]" maxLength={6} placeholder="000000" value={joinCode} onChange={e=>setJoinCode(e.target.value.replace(/\D/g,""))}/><button disabled={joinCode.length!==6||busy} onClick={joinMatch} className="primary disabled:opacity-40">Join</button></div>
        </div>
        <div className="glass rounded-2xl p-6"><div className="mb-4 flex items-center justify-between"><h2 className="text-xl font-black">ACTIVE LOBBIES</h2><button className="text-xs text-orange-300" onClick={loadMatches}>Refresh ↻</button></div>
          {matches.length===0?<div className="rounded-xl border border-dashed border-white/10 p-8 text-center"><RadioIcon/><b>Henüz açık lobi yok</b><p className="mt-1 text-xs text-zinc-500">İlk lobiyi sen oluştur.</p></div>:<div className="space-y-2">{matches.map(match=><div key={match.id} className="flex items-center justify-between rounded-xl border border-white/10 p-3"><div><b>{match.mode} · {match.map}</b><div className="mt-1 font-mono text-xs tracking-widest text-orange-300">{match.code}</div></div><button className="secondary text-xs" onClick={()=>setJoinCode(match.code)}>Use code</button></div>)}</div>}
        </div>
      </section>}
      {active&&user&&<section className="mb-10 grid gap-5 lg:grid-cols-2">
        <div className="glass rounded-2xl p-6"><span className="tag">ACTIVE LOBBY</span><h2 className="mb-4 mt-3 text-2xl font-black">MATCH ROOM</h2>
          <div className="rounded-xl border border-orange-500/30 bg-orange-500/5 p-4"><div className="text-xs text-zinc-500">MATCH CODE</div><div className="mt-1 flex items-center justify-between"><span className="font-mono text-3xl font-black tracking-[.2em] text-orange-300">{active.code}</span><button className="secondary p-2" onClick={()=>navigator.clipboard.writeText(active.code)}><Copy size={16}/></button></div></div>
          <div className="mt-4 grid grid-cols-2 gap-3 text-sm"><div className="rounded-xl bg-black/20 p-3"><small className="text-zinc-500">MODE</small><div className="font-bold">{active.mode}</div></div><div className="rounded-xl bg-black/20 p-3"><small className="text-zinc-500">MAP</small><div className="font-bold">{active.map}</div></div></div>
          <div className="mt-5 flex items-center gap-2 text-sm font-bold"><UploadCloud size={16} className="text-orange-400"/> Match evidence</div><p className="my-2 text-xs text-zinc-500">Ekran görüntüsünü erişilebilir HTTPS bağlantısına yükle. Oyun API'si olmadığı için sonuç otomatik doğrulanamaz.</p><input className="field mb-2" placeholder="Screenshot URL (https://...)" value={proofUrl} onChange={e=>setProofUrl(e.target.value)}/><button className="secondary w-full" onClick={submitEvidence} disabled={!proofUrl.startsWith("https://")}>Submit evidence for review</button>
        </div>
        <div className="glass flex min-h-[380px] flex-col rounded-2xl p-6"><div className="mb-4 flex items-center gap-2"><MessageSquare className="text-[#ff6a2a]"/><h2 className="text-xl font-black">MATCH CHAT</h2></div>
          <div className="flex-1 space-y-3 overflow-y-auto rounded-xl bg-black/20 p-3">{messages.length===0?<p className="py-10 text-center text-sm text-zinc-500">Lobide henüz mesaj yok.</p>:messages.map(message=><div key={message.id} className="rounded-lg bg-white/5 p-3"><div className="mb-1 text-[10px] text-zinc-500">{message.sender_id===user.id?"You":"Player"} · {new Date(message.created_at).toLocaleTimeString("tr-TR",{hour:"2-digit",minute:"2-digit"})}</div><div className="break-words text-sm">{message.body}</div></div>)}</div>
          <form className="mt-3 flex gap-2" onSubmit={event=>{event.preventDefault();void sendMessage()}}><input className="field" value={draft} onChange={e=>setDraft(e.target.value)} placeholder="Mesaj yaz..."/><button className="primary">Send</button></form>
        </div>
      </section>}
      <section className="glass rounded-2xl p-6"><div className="mb-4 flex items-center gap-2"><Trophy className="text-[#ff6a2a]"/><h2 className="text-xl font-black">LEADERBOARD</h2><span className="tag ml-auto">SEASON 01</span></div><div className="rounded-xl border border-dashed border-white/10 p-8 text-center"><Trophy className="mx-auto mb-3 text-zinc-600"/><b>Rankings unlock after verified matches</b><p className="mt-1 text-xs text-zinc-500">ELO yalnızca onaylanmış sonuçlardan sonra güncellenecek.</p></div></section>
      <footer className="py-8 text-center text-xs text-zinc-600">COUNTERFLAME FACEIT · COMMUNITY PROJECT · NOT AFFILIATED WITH THE GAME DEVELOPER</footer>
    </div>
  </main>;
}
function RadioIcon(){return <div className="mx-auto mb-3 text-zinc-600"><Swords size={24}/></div>}
