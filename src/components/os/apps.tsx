import { useEffect, useMemo, useRef, useState } from "react";
import QRCode from "qrcode";
import {
  Check,
  ChevronLeft,
  CloudUpload,
  Home,
  Image as ImageIcon,
  Loader2,
  Plus,
  RefreshCw,
  Send,
  Search,
  Send as SendIcon,
  Trash2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useOs } from "@/os/store";
import { useMusic, seekTo } from "@/os/music";
import { useWeather } from "@/os/useWeather";
import { orbitReply, type OrbitMessage } from "@/os/orbit.functions";
import { createSignedUrls, saveToGallery } from "@/os/media.functions";
import {
  addAlarm,
  listAlarms,
  removeAlarm,
  toggleAlarm,
  type Alarm,
} from "@/os/alarms";
import { geocodeCity } from "@/os/weather";
import {
  ACCENTS,
  APPS,
  CLOCK_COLORS,
  CLOCK_FONTS,
  TRACKS,
  WALLPAPERS,
  appById,
  clockFontStack,
  uvBand,
  wallpaperById,
  weatherInfo,
  type AccentId,
  type AppId,
  type WallpaperId,
} from "@/os/osData";
import {
  Clock,
  WeatherDetailRow,
  formatDay,
  useNow,
} from "@/components/os/screens";

/* ============ shared frame & controls ============ */

function AppFrame({ app, children }: { app: AppId; children: React.ReactNode }) {
  const def = appById(app);
  const goHome = useOs((s) => s.goHome);
  const openApp = useOs((s) => s.openApp);
  return (
    <div className="relative h-screen overflow-hidden">
      <Wallpaper />
      <div className="anim-screen relative flex h-full flex-col p-8">
        <header className="flex items-center gap-4">
          <button data-tv-focus onClick={goHome} className="glass-chip flex items-center gap-2 px-4 py-2 text-sm hover:bg-white/10">
            <Home className="h-4 w-4" /> Home
          </button>
          <h1 className="glow-text text-2xl font-bold">{def.name}</h1>
          <p className="hidden text-xs text-muted-foreground md:block">{def.tagline}</p>
          <div className="flex-1" />
          <button data-tv-focus onClick={goHome} className="glass-chip p-2.5 hover:bg-white/10" aria-label="Back to home">
            <ChevronLeft className="h-4 w-4" />
          </button>
        </header>
        <div className="mt-6 min-h-0 flex-1 overflow-y-auto pr-1">{children}</div>
      </div>
    </div>
  );
}

function Wallpaper() {
  const { wallpaper, liveWallpaper } = useOs((s) => s.settings);
  const wp = wallpaperById(wallpaper);
  return (
    <div className="absolute inset-0 overflow-hidden bg-background">
      <img src={wp.src} alt="" className={`h-full w-full object-cover ${liveWallpaper ? "live-wallpaper" : ""}`} />
      <div className="absolute inset-0" style={{ background: "oklch(0.1 0.03 265 / 0.45)" }} />
    </div>
  );
}

function Toggle({ on, onClick, label }: { on: boolean; onClick: () => void; label: string }) {
  return (
    <button data-tv-focus onClick={onClick} className="flex w-full items-center justify-between px-1 py-2 text-left">
      <span className="text-sm font-medium">{label}</span>
      <span
        className="relative h-6 w-11 rounded-full transition-colors"
        style={{ background: on ? "var(--accent-live)" : "oklch(1 0 0 / 0.14)" }}
      >
        <span
          className="absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all"
          style={{ left: on ? "22px" : "2px" }}
        />
      </span>
    </button>
  );
}

function Segmented<T extends string>({ value, options, onChange }: { value: T; options: { id: T; name: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="glass-soft inline-flex gap-1 rounded-full p-1">
      {options.map((o) => (
        <button
          key={o.id}
          data-tv-focus
          onClick={() => onChange(o.id)}
          className="rounded-full px-4 py-1.5 text-xs font-semibold transition-colors"
          style={{ background: value === o.id ? "var(--accent-live)" : "transparent", color: value === o.id ? "oklch(0.16 0.03 265)" : undefined }}
        >
          {o.name}
        </button>
      ))}
    </div>
  );
}

function SliderRow({ label, value, min, max, onChange, unit = "" }: { label: string; value: number; min: number; max: number; onChange: (v: number) => void; unit?: string }) {
  return (
    <div className="py-2">
      <div className="mb-2 flex justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span className="text-muted-foreground">{value}{unit}</span>
      </div>
      <input type="range" className="tv-slider w-full" min={min} max={max} value={value} onChange={(e) => onChange(Number(e.target.value))} style={{ background: `linear-gradient(90deg, var(--accent-live) ${((value - min) / (max - min)) * 100}%, oklch(1 0 0 / 0.14) ${((value - min) / (max - min)) * 100}%)` }} />
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="glass mb-4 p-6">
      <h2 className="mb-3 text-xs font-bold uppercase tracking-[0.25em] text-muted-foreground">{title}</h2>
      {children}
    </section>
  );
}

/* ============ Gallery ============ */

interface MediaRow {
  id: string;
  kind: string;
  mime_type: string;
  storage_path: string;
  title: string;
}

export function GalleryApp() {
  const [items, setItems] = useState<MediaRow[] | null>(null);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setItems([]); return; }
    const { data } = await supabase
      .from("media")
      .select("id,kind,mime_type,storage_path,title")
      .order("created_at", { ascending: false })
      .limit(60);
    setItems((data ?? []) as MediaRow[]);
    if (data?.length) {
      const u = await createSignedUrls({ data: { bucket: "media", paths: data.map((d) => d.storage_path) } });
      setUrls(u);
    }
  };

  useEffect(() => { void load(); }, []);

  const upload = async (files: FileList | null) => {
    if (!files?.length) return;
    setBusy(true);
    const { data: { user } } = await supabase.auth.getUser();
    for (const f of Array.from(files).slice(0, 8)) {
      const path = `${user?.id}/${Date.now()}-${f.name.replace(/[^\w.\- ]+/g, "_")}`;
      const { error } = await supabase.storage.from("media").upload(path, f, { contentType: f.type });
      if (!error) {
        const kind = f.type.startsWith("video") ? "video" : f.type.startsWith("audio") ? "audio" : "image";
        await supabase.from("media").insert({ user_id: user?.id, kind, mime_type: f.type, size_bytes: f.size, storage_path: path, title: f.name });
      }
    }
    setBusy(false);
    void load();
  };

  const del = async (item: MediaRow) => {
    await supabase.storage.from("media").remove([item.storage_path]);
    await supabase.from("media").delete().eq("id", item.id);
    void load();
  };

  return (
    <AppFrame app="gallery">
      <div className="mb-4 flex items-center gap-3">
        <input ref={fileRef} type="file" multiple accept="image/*,video/*,audio/*" className="hidden" onChange={(e) => { void upload(e.target.files); e.target.value = ""; }} />
        <button data-tv-focus onClick={() => fileRef.current?.click()} className="glass-chip flex items-center gap-2 px-4 py-2 text-sm hover:bg-white/10">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CloudUpload className="h-4 w-4" />} Upload
        </button>
        <button data-tv-focus onClick={() => void load()} className="glass-chip flex items-center gap-2 px-4 py-2 text-sm hover:bg-white/10">
          <RefreshCw className="h-4 w-4" /> Refresh
        </button>
        <p className="text-xs text-muted-foreground">Files stay in your private cloud library</p>
      </div>

      {items === null ? (
        <p className="p-10 text-center text-sm text-muted-foreground">Loading your library…</p>
      ) : items.length === 0 ? (
        <div className="glass flex flex-col items-center gap-3 p-14 text-center">
          <ImageIcon className="h-10 w-10 opacity-60" />
          <p className="font-medium">Your cloud library is empty</p>
          <p className="text-sm text-muted-foreground">Upload here, or send files from your phone with the Transfer app.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {items.map((m) => {
            const url = urls[m.storage_path];
            return (
              <div key={m.id} className="glass group relative overflow-hidden p-0">
                <div className="flex h-44 items-center justify-center bg-black/30">
                  {m.kind === "image" && url && <img src={url} alt={m.title} className="h-full w-full object-cover" />}
                  {m.kind === "video" && url && <video src={url} controls className="h-full w-full object-cover" />}
                  {m.kind === "audio" && (
                    <div className="flex h-full w-full flex-col items-center justify-center gap-2 p-3">
                      <div className="flex h-8 items-end gap-1">
                        {Array.from({ length: 9 }).map((_, i) => (
                          <span key={i} className={`w-1.5 rounded-full ${urls ? "wave-bar" : ""}`} style={{ height: `${8 + ((i * 7) % 22)}px`, background: "var(--accent-live)", animationDelay: `${i * 0.12}s` }} />
                        ))}
                      </div>
                      {url && <audio src={url} controls className="w-full" />}
                    </div>
                  )}
                  {!url && m.kind !== "audio" && <Loader2 className="h-5 w-5 animate-spin opacity-50" />}
                </div>
                <div className="flex items-center justify-between gap-2 px-3 py-2">
                  <p className="truncate text-xs font-medium">{m.title}</p>
                  <button onClick={() => void del(m)} className="rounded-full p-1 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-white/10" aria-label="Delete">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </AppFrame>
  );
}

/* ============ Music ============ */

export function MusicApp() {
  const music = useMusic();
  const update = useOs((s) => s.update);
  const { volume, brightness } = useOs((s) => s.settings);
  const [q, setQ] = useState("");
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return TRACKS;
    return TRACKS.filter((t) => `${t.title} ${t.artist} ${t.mood}`.toLowerCase().includes(s));
  }, [q]);
  const cur = music.current();

  return (
    <AppFrame app="music">
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div>
          <div className="glass-soft mb-4 flex items-center gap-3 rounded-full px-4 py-2.5">
            <Search className="h-4 w-4 opacity-60" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search songs, artists, moods…" className="w-full bg-transparent text-sm outline-none" />
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {filtered.map((t) => (
              <button
                key={t.id}
                data-tv-focus
                onClick={() => music.play(t.id)}
                className={`glass tv-tile flex items-center gap-3 p-3 text-left ${music.currentId === t.id && music.playing ? "ring-1" : ""}`}
                style={music.currentId === t.id ? { boxShadow: "0 0 0 1px var(--glow-soft)" } : undefined}
              >
                <div className="flex h-10 w-10 shrink-0 items-end justify-center gap-[3px] rounded-xl" style={{ background: "var(--glow-soft)" }}>
                  {music.currentId === t.id && music.playing
                    ? [0, 1, 2].map((i) => (
                        <span key={i} className="wave-bar h-5 w-[3px] rounded-full" style={{ background: "var(--accent-live)", animationDelay: `${i * 0.18}s` }} />
                      ))
                    : <span className="h-2 w-2 rounded-full" style={{ background: "var(--accent-live)" }} />}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{t.title}</p>
                  <p className="truncate text-xs text-muted-foreground">{t.artist} · {t.mood}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="glass flex h-fit flex-col gap-5 p-6">
          <div className="flex h-24 items-end justify-center gap-1.5">
            {Array.from({ length: 22 }).map((_, i) => (
              <span
                key={i}
                className={`w-2 rounded-full ${music.playing ? "wave-bar" : ""}`}
                style={{
                  height: music.playing ? `${14 + ((i * 13) % 70)}px` : "8px",
                  background: "var(--accent-live)",
                  opacity: 0.4 + ((i % 5) * 0.15),
                  animationDelay: `${(i % 7) * 0.13}s`,
                }}
              />
            ))}
          </div>
          <div className="text-center">
            <p className="text-xl font-bold">{cur?.title ?? "Nothing playing"}</p>
            <p className="text-sm text-muted-foreground">{cur?.artist ?? "Pick a track"}</p>
          </div>
          <input type="range" className="tv-slider w-full" min={0} max={1000} value={Math.round(music.progress * 1000)} onChange={(e) => seekTo(Number(e.target.value) / 1000)} style={{ background: `linear-gradient(90deg, var(--accent-live) ${music.progress * 100}%, oklch(1 0 0 / 0.14) ${music.progress * 100}%)` }} />
          <div className="flex items-center justify-center gap-5">
            <button data-tv-focus onClick={() => music.prev()} className="glass-chip p-3 hover:bg-white/10" aria-label="Previous">⏮</button>
            <button data-tv-focus onClick={() => music.toggle()} className="glass-chip p-5 text-lg hover:bg-white/10" aria-label="Play or pause">{music.playing ? "⏸" : "▶"}</button>
            <button data-tv-focus onClick={() => music.next()} className="glass-chip p-3 hover:bg-white/10" aria-label="Next">⏭</button>
            <button data-tv-focus onClick={() => music.setShuffle(!music.shuffle)} className="glass-chip p-3 hover:bg-white/10" style={{ color: music.shuffle ? "var(--accent-live)" : undefined }} aria-label="Shuffle">🔀</button>
          </div>
          <div className="border-t pt-4" style={{ borderColor: "var(--glass-line)" }}>
            <SliderRow label="Volume" value={volume} min={0} max={100} unit="%" onChange={(v) => update({ volume: v })} />
            <SliderRow label="Brightness" value={brightness} min={5} max={100} unit="%" onChange={(v) => update({ brightness: v })} />
          </div>
        </div>
      </div>
    </AppFrame>
  );
}

/* ============ Orbit AI ============ */

interface ChatMsg extends OrbitMessage { tags?: boolean }

export function OrbitApp() {
  const [msgs, setMsgs] = useState<ChatMsg[]>([
    { role: "assistant", content: "Hey! I'm Orbit. Ask me to play music, change the wallpaper, set the mood — or just chat." },
  ]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => { scroller.current?.scrollTo({ top: 1e6, behavior: "smooth" }); }, [msgs, thinking]);

  const runAction = (tag: string) => {
    const [name, arg = ""] = tag.split(":");
    const music = useMusic.getState();
    const os = useOs.getState();
    const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
    switch (name) {
      case "play": {
        const a = arg.trim().toLowerCase();
        const t = TRACKS.find((x) => x.title.toLowerCase().includes(a) || x.artist.toLowerCase().includes(a) || x.mood.toLowerCase() === a) ?? TRACKS[0];
        music.play(t?.id);
        break;
      }
      case "pause": music.stop(); break;
      case "next": music.next(); break;
      case "prev": music.prev(); break;
      case "volume": os.update({ volume: clamp(Number(arg) || os.settings.volume, 0, 100) }); break;
      case "brightness": os.update({ brightness: clamp(Number(arg) || os.settings.brightness, 5, 100) }); break;
      case "open": if (APPS.some((a) => a.id === arg)) os.openApp(arg as AppId); break;
      case "wallpaper": if (WALLPAPERS.some((w) => w.id === arg)) os.update({ wallpaper: arg as WallpaperId }); break;
      case "accent": if (ACCENTS.some((c) => c.id === arg)) os.update({ accent: arg as AccentId }); break;
      case "lock": os.lock(); break;
    }
  };

  const send = async () => {
    const text = input.trim();
    if (!text || thinking) return;
    setInput("");
    const next: ChatMsg[] = [...msgs, { role: "user", content: text }];
    setMsgs(next);
    setThinking(true);
    try {
      const res = await orbitReply({ data: { messages: next.filter((m) => !m.tags).slice(-12) } });
      const reply = res.reply ?? "";
      const tags = Array.from(reply.matchAll(/\[\[(.+?)\]\]/g)).map((m) => m[1]);
      tags.forEach(runAction);
      setMsgs((m) => [...m, { role: "assistant", content: reply.replace(/\[\[.+?\]\]/g, "").trim() || "Done!", tags: tags.length > 0 }]);
    } catch {
      setMsgs((m) => [...m, { role: "assistant", content: "I couldn't reach my brain just then. Try again in a moment." }]);
    } finally {
      setThinking(false);
    }
  };

  return (
    <AppFrame app="orbit">
      <div className="mx-auto flex max-w-3xl flex-col" style={{ height: "72vh" }}>
        <div ref={scroller} className="min-h-0 flex-1 space-y-3 overflow-y-auto pb-4">
          {msgs.map((m, i) => (
            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${m.role === "user" ? "glass" : "glass-soft"}`} style={m.role === "user" ? { background: "var(--glow-soft)" } : undefined}>
                {m.content}
              </div>
            </div>
          ))}
          {thinking && (
            <div className="flex justify-start">
              <div className="glass-soft flex items-center gap-1.5 rounded-2xl px-4 py-3">
                {[0, 1, 2].map((i) => (
                  <span key={i} className="wave-dot h-2 w-2 rounded-full" style={{ background: "var(--accent-live)", animationDelay: `${i * 0.2}s` }} />
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="glass-soft flex items-center gap-3 rounded-full px-5 py-3">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && void send()}
            placeholder="Ask Orbit anything…"
            className="w-full bg-transparent text-sm outline-none"
          />
          <button data-tv-focus onClick={() => void send()} disabled={thinking} className="glass-chip p-2.5 hover:bg-white/10 disabled:opacity-40" aria-label="Send">
            <SendIcon className="h-4 w-4" />
          </button>
        </div>
      </div>
    </AppFrame>
  );
}

/* ============ Transfer ============ */

interface TransferRow {
  id: string;
  code: string;
  filename: string;
  mime_type: string;
  size_bytes: number;
  storage_path: string;
  expires_at: string;
}

export function TransferApp() {
  const [qr, setQr] = useState<string | null>(null);
  const [rows, setRows] = useState<TransferRow[]>([]);
  const [saving, setSaving] = useState<string | null>(null);
  const uidRef = useRef<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      uidRef.current = user.id;
      setQr(await QRCode.toDataURL(`${window.location.origin}/transfer?tv=${user.id}`, { width: 260, margin: 1, color: { dark: "#0b1020", light: "#eaf2ff" } }));
    })();
  }, []);

  useEffect(() => {
    const poll = async () => {
      const { data } = await supabase
        .from("transfers")
        .select("id,code,filename,mime_type,size_bytes,storage_path,expires_at")
        .order("created_at", { ascending: false })
        .limit(20);
      setRows(((data ?? []) as TransferRow[]).filter((r) => new Date(r.expires_at).getTime() > Date.now()));
    };
    void poll();
    const t = setInterval(poll, 4000);
    return () => clearInterval(t);
  }, []);

  const save = async (r: TransferRow) => {
    setSaving(r.id);
    try {
      await saveToGallery({ data: { storage_path: r.storage_path, title: r.filename, mime_type: r.mime_type, size_bytes: r.size_bytes } });
      await supabase.storage.from("transfers").remove([r.storage_path]);
      await supabase.from("transfers").delete().eq("id", r.id);
      useOs.getState().notify("Transfer saved", `${r.filename} moved to your gallery`);
    } catch {
      useOs.getState().notify("Transfer failed", `Could not save ${r.filename}`);
    }
    setSaving(null);
  };

  const discard = async (r: TransferRow) => {
    await supabase.storage.from("transfers").remove([r.storage_path]);
    await supabase.from("transfers").delete().eq("id", r.id);
    setRows((rs) => rs.filter((x) => x.id !== r.id));
  };

  const mb = (b: number) => (b > 1e6 ? `${(b / 1e6).toFixed(1)} MB` : `${Math.round(b / 1024)} KB`);

  return (
    <AppFrame app="transfer">
      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <div className="glass flex h-fit flex-col items-center gap-3 p-6 text-center">
          {qr ? <img src={qr} alt="Scan to send files to this TV" className="rounded-xl" /> : <Loader2 className="h-8 w-8 animate-spin opacity-60" />}
          <p className="text-sm font-semibold">Send from your phone</p>
          <p className="text-xs text-muted-foreground">Scan this with your phone camera. Files up to 25 MB arrive here within seconds.</p>
        </div>
        <div>
          <h2 className="mb-3 text-xs font-bold uppercase tracking-[0.25em] text-muted-foreground">Inbox</h2>
          {rows.length === 0 ? (
            <p className="glass p-10 text-center text-sm text-muted-foreground">Nothing here yet. Send something from your phone — it shows up automatically.</p>
          ) : (
            <div className="space-y-2">
              {rows.map((r) => (
                <div key={r.id} className="glass flex items-center gap-3 p-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: "var(--glow-soft)" }}>
                    <SendIcon className="h-4 w-4" style={{ color: "var(--accent-live)" }} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{r.filename}</p>
                    <p className="text-xs text-muted-foreground">{mb(r.size_bytes)} · {r.code}</p>
                  </div>
                  <button data-tv-focus onClick={() => void save(r)} disabled={saving === r.id} className="glass-chip flex items-center gap-2 px-4 py-2 text-xs font-semibold hover:bg-white/10 disabled:opacity-50">
                    {saving === r.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />} Save to Gallery
                  </button>
                  <button onClick={() => void discard(r)} className="rounded-full p-2 hover:bg-white/10" aria-label="Discard">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppFrame>
  );
}

/* ============ Tools: alarms, modes, calculator ============ */

export function ToolsApp() {
  const [tab, setTab] = useState<"alarms" | "modes" | "calc">("alarms");
  return (
    <AppFrame app="tools">
      <div className="mb-4">
        <Segmented value={tab} onChange={setTab} options={[{ id: "alarms", name: "Alarms" }, { id: "modes", name: "Modes" }, { id: "calc", name: "Calculator" }]} />
      </div>
      {tab === "alarms" && <AlarmsPanel />}
      {tab === "modes" && <ModesPanel />}
      {tab === "calc" && <Calculator />}
    </AppFrame>
  );
}

function AlarmsPanel() {
  const notify = useOs((s) => s.notify);
  const [alarms, setAlarms] = useState<Alarm[] | null>(null);
  const [hour, setHour] = useState(7);
  const [minute, setMinute] = useState(0);
  const [label, setLabel] = useState("");

  const load = () => { listAlarms().then(setAlarms).catch(() => setAlarms([])); };
  useEffect(load, []);

  const add = async () => {
    const a = await addAlarm({ hour, minute, label: label.trim() || "Alarm" });
    if (a) { setAlarms((x) => [...(x ?? []), a].sort((p, q2) => p.hour * 60 + p.minute - (q2.hour * 60 + q2.minute))); setLabel(""); notify("Alarm set", `Rings at ${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`); }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="space-y-2">
        {alarms === null ? (
          <p className="text-sm text-muted-foreground">Loading alarms…</p>
        ) : alarms.length === 0 ? (
          <p className="glass p-10 text-center text-sm text-muted-foreground">No alarms yet — set one on the right.</p>
        ) : (
          alarms.map((a) => (
            <div key={a.id} className="glass flex items-center gap-4 p-4">
              <p className="text-3xl font-bold tabular-nums">{String(a.hour).padStart(2, "0")}:{String(a.minute).padStart(2, "0")}</p>
              <p className="min-w-0 flex-1 truncate text-sm text-muted-foreground">{a.label}</p>
              <Toggle on={a.enabled} label="" onClick={async () => { await toggleAlarm(a.id, !a.enabled); load(); }} />
              <button onClick={async () => { await removeAlarm(a.id); load(); }} className="rounded-full p-2 hover:bg-white/10" aria-label="Delete alarm">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))
        )}
      </div>
      <div className="glass h-fit space-y-3 p-6">
        <p className="text-xs font-bold uppercase tracking-[0.25em] text-muted-foreground">New alarm</p>
        <div className="flex items-center gap-2">
          <input type="number" min={0} max={23} value={hour} onChange={(e) => setHour(Math.min(23, Math.max(0, Number(e.target.value))))} className="glass-soft w-20 rounded-xl px-3 py-2 text-center text-xl font-bold outline-none" />
          <span className="text-2xl font-bold">:</span>
          <input type="number" min={0} max={59} value={minute} onChange={(e) => setMinute(Math.min(59, Math.max(0, Number(e.target.value))))} className="glass-soft w-20 rounded-xl px-3 py-2 text-center text-xl font-bold outline-none" />
        </div>
        <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Label (e.g. Wake up)" className="glass-soft w-full rounded-xl px-4 py-2.5 text-sm outline-none" />
        <button data-tv-focus onClick={() => void add()} className="glass-chip flex w-full items-center justify-center gap-2 py-3 text-sm font-semibold hover:bg-white/10">
          <Plus className="h-4 w-4" /> Set alarm
        </button>
      </div>
    </div>
  );
}

function ModesPanel() {
  const s = useOs((st) => st.settings);
  const update = useOs((st) => st.update);
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Section title="Focus & sleep">
        <Toggle on={s.dnd} label="Do Not Disturb — hide notifications" onClick={() => update({ dnd: !s.dnd })} />
        <Toggle on={s.bedtimeEnabled} label="Bedtime mode" onClick={() => update({ bedtimeEnabled: !s.bedtimeEnabled })} />
        {s.bedtimeEnabled && (
          <div className="flex items-center gap-2 pt-2 text-sm">
            <input type="time" value={s.bedtimeFrom} onChange={(e) => update({ bedtimeFrom: e.target.value })} className="glass-soft rounded-lg px-3 py-1.5 outline-none" />
            <span className="text-muted-foreground">to</span>
            <input type="time" value={s.bedtimeTo} onChange={(e) => update({ bedtimeTo: e.target.value })} className="glass-soft rounded-lg px-3 py-1.5 outline-none" />
          </div>
        )}
      </Section>
      <Section title="Eye & display">
        <Toggle on={s.eyeProtection} label="Eye protection — warm tint" onClick={() => update({ eyeProtection: !s.eyeProtection })} />
        <Toggle on={s.colorInversion} label="Colour inversion" onClick={() => update({ colorInversion: !s.colorInversion })} />
        <Toggle on={s.dayTheme} label="Day theme (light)" onClick={() => update({ dayTheme: !s.dayTheme })} />
      </Section>
      <Section title="Battery">
        <Toggle on={s.batterySaver} label="Battery saver — pause animations" onClick={() => update({ batterySaver: !s.batterySaver, superBatterySaver: false })} />
        <Toggle on={s.superBatterySaver} label="Super battery saver — greyscale, minimal" onClick={() => update({ superBatterySaver: !s.superBatterySaver, batterySaver: false })} />
      </Section>
      <Section title="Picture">
        <Segmented value={s.pictureMode} onChange={(v) => update({ pictureMode: v })} options={[{ id: "standard" as const, name: "Standard" }, { id: "vivid" as const, name: "Vivid" }, { id: "cinema" as const, name: "Cinema" }, { id: "eco" as const, name: "Eco" }]} />
      </Section>
    </div>
  );
}

function Calculator() {
  const [acc, setAcc] = useState<number | null>(null);
  const [op, setOp] = useState<string | null>(null);
  const [cur, setCur] = useState("0");
  const [fresh, setFresh] = useState(true);

  const digit = (d: string) => { setCur(fresh || cur === "0" ? d : cur + d); setFresh(false); };
  const apply = (a: number, b: number, o: string) => (o === "+" ? a + b : o === "−" ? a - b : o === "×" ? a * b : b === 0 ? NaN : a / b);
  const setOperator = (o: string) => {
    if (acc !== null && op && !fresh) { const r = apply(acc, Number(cur), op); setAcc(r); setCur(String(r)); }
    else setAcc(Number(cur));
    setOp(o); setFresh(true);
  };
  const equals = () => {
    if (acc !== null && op) { const r = apply(acc, Number(cur), op); setCur(Number.isNaN(r) ? "Error" : String(Math.round(r * 1e10) / 1e10)); setAcc(null); setOp(null); setFresh(true); }
  };

  const keys: { label: string; act: () => void; kind?: string }[] = [
    { label: "C", act: () => { setCur("0"); setAcc(null); setOp(null); setFresh(true); }, kind: "fn" },
    { label: "±", act: () => setCur(String(-Number(cur))), kind: "fn" },
    { label: "%", act: () => setCur(String(Number(cur) / 100)), kind: "fn" },
    { label: "÷", act: () => setOperator("÷"), kind: "fn" },
    { label: "7", act: () => digit("7") }, { label: "8", act: () => digit("8") }, { label: "9", act: () => digit("9") }, { label: "×", act: () => setOperator("×"), kind: "fn" },
    { label: "4", act: () => digit("4") }, { label: "5", act: () => digit("5") }, { label: "6", act: () => digit("6") }, { label: "−", act: () => setOperator("−"), kind: "fn" },
    { label: "1", act: () => digit("1") }, { label: "2", act: () => digit("2") }, { label: "3", act: () => digit("3") }, { label: "+", act: () => setOperator("+"), kind: "fn" },
    { label: "0", act: () => digit("0") }, { label: ".", act: () => !cur.includes(".") && digit("."), kind: "fn" }, { label: "⌫", act: () => setCur(cur.length > 1 ? cur.slice(0, -1) : "0"), kind: "fn" }, { label: "=", act: equals, kind: "eq" },
  ];

  return (
    <div className="mx-auto max-w-md">
      <div className="glass mb-3 flex min-h-24 items-end justify-end p-6">
        <p className="glow-text truncate text-5xl font-light tabular-nums">{cur}</p>
      </div>
      <div className="grid grid-cols-4 gap-2.5">
        {keys.map((k) => (
          <button
            key={k.label}
            data-tv-focus
            onClick={k.act}
            className={`glass tv-tile flex h-16 items-center justify-center text-xl font-semibold hover:bg-white/10 ${k.kind === "eq" ? "text-2xl" : ""}`}
            style={k.kind === "eq" ? { background: "var(--glow-soft)", color: "var(--accent-live)" } : k.kind === "fn" ? { color: "var(--accent-live)" } : undefined}
          >
            {k.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ============ Weather ============ */

export function WeatherApp() {
  const { data: w, isLoading } = useWeather();
  const settings = useOs((s) => s.settings);
  const update = useOs((s) => s.update);
  const [q, setQ] = useState("");
  const now = useNow(60000);

  const search = async () => {
    const hit = await geocodeCity(q.trim());
    if (hit) { update({ weatherCity: hit.name, weatherLat: hit.lat, weatherLon: hit.lon }); setQ(""); }
  };

  const info = w ? weatherInfo(w.code) : null;
  const WIcon = info ? (info.icon === "sun" ? Sun2 : info.icon === "cloud-sun" ? CloudSun : info.icon === "rain" ? CloudRain : info.icon === "snow" ? CloudSnow : info.icon === "storm" ? CloudLightning : Cloud) : Cloud;

  return (
    <AppFrame app="weather">
      <div className="mb-5 flex items-center gap-3">
        <div className="glass-soft flex flex-1 items-center gap-3 rounded-full px-4 py-2.5">
          <Search className="h-4 w-4 opacity-60" />
          <input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && void search()} placeholder={`Change city (now: ${settings.weatherCity})`} className="w-full bg-transparent text-sm outline-none" />
        </div>
        <button data-tv-focus onClick={() => void search()} className="glass-chip px-4 py-2.5 text-sm font-semibold hover:bg-white/10">Search</button>
      </div>

      {isLoading || !w ? (
        <p className="p-10 text-center text-sm text-muted-foreground">Fetching the sky…</p>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="glass flex flex-col items-center justify-center gap-3 p-10">
            <WIcon className="h-20 w-20" style={{ color: "var(--accent-live)" }} />
            <p className="glow-text text-7xl font-extralight">{w.temp}°</p>
            <p className="text-lg font-medium">{info?.label}</p>
            <p className="text-sm text-muted-foreground">{w.city} · {formatDay(now)}</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <WeatherDetailRow icon={Sun} label="UV index" value={`${w.uv} · ${uvBand(w.uv).label}`} />
            <WeatherDetailRow icon={Thermometer} label="Feels like" value={`${w.feelsLike}°`} />
            <WeatherDetailRow icon={Droplet} label="Humidity" value={`${w.humidity}%`} />
            <WeatherDetailRow icon={WindIcon} label="Wind" value={`${w.wind} km/h`} />
            <div className="col-span-2 glass flex items-center gap-4 p-5">
              <Sun className="h-6 w-6" style={{ color: uvBand(w.uv).color }} />
              <div>
                <p className="text-xs text-muted-foreground">Sun safety</p>
                <p className="text-sm font-medium">{w.uv >= 6 ? "Use sunscreen and shade — the sun is strong." : "Low risk today. Enjoy the outdoors."}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </AppFrame>
  );
}

/* ============ Settings ============ */

export function SettingsApp() {
  const s = useOs((st) => st.settings);
  const update = useOs((st) => st.update);
  const updateLockWidgets = useOs((st) => st.updateLockWidgets);
  const updateHomeWidgets = useOs((st) => st.updateHomeWidgets);
  const resetSettings = useOs((st) => st.resetSettings);

  return (
    <AppFrame app="settings">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Section title="Clock">
          <p className="mb-2 text-sm font-medium">Style</p>
          <Segmented value={s.clockStyle} onChange={(v) => update({ clockStyle: v })} options={[{ id: "minimal" as const, name: "Minimal" }, { id: "bold" as const, name: "Bold" }, { id: "analog" as const, name: "Analog" }, { id: "split" as const, name: "Split" }]} />
          <p className="mb-2 mt-4 text-sm font-medium">Font</p>
          <div className="flex flex-wrap gap-2">
            {CLOCK_FONTS.map((f) => (
              <button key={f.id} data-tv-focus onClick={() => update({ clockFont: f.id })} className="glass-chip px-3 py-1.5 text-xs" style={s.clockFont === f.id ? { background: "var(--glow-soft)", color: "var(--accent-live)" } : undefined}>
                <span style={{ fontFamily: f.stack }}>{f.name}</span>
              </button>
            ))}
          </div>
          <p className="mb-2 mt-4 text-sm font-medium">Colour</p>
          <div className="flex gap-2">
            {CLOCK_COLORS.map((c) => (
              <button key={c.id} onClick={() => update({ clockColor: c.id })} className="h-8 w-8 rounded-full border" style={{ background: c.value, borderColor: s.clockColor === c.id ? "var(--accent-live)" : "transparent" }} aria-label={`Clock colour ${c.name}`} />
            ))}
          </div>
          <div className="mt-2"><Toggle on={s.use24h} label="24-hour time" onClick={() => update({ use24h: !s.use24h })} /></div>
        </Section>

        <Section title="Wallpaper & accent">
          <div className="grid grid-cols-2 gap-2">
            {WALLPAPERS.map((wp) => (
              <button key={wp.id} data-tv-focus onClick={() => update({ wallpaper: wp.id })} className={`overflow-hidden rounded-xl border-2 ${s.wallpaper === wp.id ? "" : "border-transparent"}`} style={{ borderColor: s.wallpaper === wp.id ? "var(--accent-live)" : undefined }}>
                <img src={wp.src} alt={wp.name} className="h-20 w-full object-cover" />
                <p className="px-2 py-1 text-[10px] font-medium">{wp.name}{wp.live ? " · live" : ""}</p>
              </button>
            ))}
          </div>
          <Toggle on={s.liveWallpaper} label="Live wallpaper motion" onClick={() => update({ liveWallpaper: !s.liveWallpaper })} />
          <p className="mb-2 mt-3 text-sm font-medium">Accent colour</p>
          <div className="flex gap-2">
            {ACCENTS.map((a) => (
              <button key={a.id} onClick={() => update({ accent: a.id })} className="h-8 w-8 rounded-full border-2" style={{ background: a.oklch, borderColor: s.accent === a.id ? "var(--foreground)" : "transparent" }} aria-label={`Accent ${a.name}`} />
            ))}
          </div>
        </Section>

        <Section title="Display & sound">
          <SliderRow label="Brightness" value={s.brightness} min={5} max={100} unit="%" onChange={(v) => update({ brightness: v })} />
          <SliderRow label="Volume" value={s.volume} min={0} max={100} unit="%" onChange={(v) => update({ volume: v })} />
          <p className="mb-2 mt-3 text-sm font-medium">Picture mode</p>
          <Segmented value={s.pictureMode} onChange={(v) => update({ pictureMode: v })} options={[{ id: "standard" as const, name: "Standard" }, { id: "vivid" as const, name: "Vivid" }, { id: "cinema" as const, name: "Cinema" }, { id: "eco" as const, name: "Eco" }]} />
        </Section>

        <Section title="Lock screen">
          {([["weather", "Weather"], ["uv", "UV index"], ["music", "Now playing"], ["quote", "Quote"], ["calendar", "Calendar"]] as const).map(([k, name]) => (
            <Toggle key={k} on={s.lockWidgets[k]} label={name} onClick={() => updateLockWidgets({ [k]: !s.lockWidgets[k] })} />
          ))}
          <Toggle on={s.pinEnabled} label="PIN lock" onClick={() => update({ pinEnabled: !s.pinEnabled })} />
          {s.pinEnabled && (
            <input value={s.pin} onChange={(e) => update({ pin: e.target.value.replace(/\D/g, "").slice(0, 4) })} placeholder="4-digit PIN" inputMode="numeric" className="glass-soft mt-1 w-32 rounded-xl px-4 py-2 text-center tracking-[0.4em] outline-none" />
          )}
          <SliderRow label="Auto-lock after" value={s.autoLockMin} min={5} max={60} unit=" min" onChange={(v) => update({ autoLockMin: v })} />
        </Section>

        <Section title="Home & profile">
          {([["clock", "Big clock"], ["weather", "Weather"], ["uv", "UV"], ["music", "Music"], ["profile", "Profile shortcuts"]] as const).map(([k, name]) => (
            <Toggle key={k} on={s.homeWidgets[k]} label={name} onClick={() => updateHomeWidgets({ [k]: !s.homeWidgets[k] })} />
          ))}
          <input value={s.profileName} onChange={(e) => update({ profileName: e.target.value })} placeholder="Profile name" className="glass-soft mt-2 w-full rounded-xl px-4 py-2 text-sm outline-none" />
          <input value={s.profileStatus} onChange={(e) => update({ profileStatus: e.target.value })} placeholder="Status line" className="glass-soft mt-2 w-full rounded-xl px-4 py-2 text-sm outline-none" />
          <div className="mt-2 flex items-center gap-2">
            <input value={s.profileAvatar} onChange={(e) => update({ profileAvatar: e.target.value.slice(0, 2) })} className="glass-soft w-14 rounded-xl px-2 py-2 text-center text-xl outline-none" />
            <p className="text-xs text-muted-foreground">Avatar emoji</p>
          </div>
        </Section>

        <Section title="Idle & power">
          <Toggle on={s.screensaverEnabled} label="Screensaver" onClick={() => update({ screensaverEnabled: !s.screensaverEnabled })} />
          {s.screensaverEnabled && (
            <>
              <SliderRow label="After" value={s.screensaverAfterMin} min={1} max={15} unit=" min" onChange={(v) => update({ screensaverAfterMin: v })} />
              <Segmented value={s.screensaverStyle} onChange={(v) => update({ screensaverStyle: v })} options={[{ id: "aurora" as const, name: "Aurora" }, { id: "jellyfish" as const, name: "Bubbles" }]} />
            </>
          )}
          <Toggle on={s.aodEnabled} label="Always-On Display" onClick={() => update({ aodEnabled: !s.aodEnabled })} />
          <Toggle on={s.aodDynamic} label="Dynamic AOD — rotating quotes" onClick={() => update({ aodDynamic: !s.aodDynamic })} />
          <Toggle on={s.dnd} label="Do Not Disturb" onClick={() => update({ dnd: !s.dnd })} />
        </Section>

        <Section title="About">
          <p className="text-sm font-semibold">OriginTV</p>
          <p className="text-xs text-muted-foreground">Liquid glass TV OS · v1.0 · built on OriginOS ideas</p>
          <button data-tv-focus onClick={() => { if (confirm("Reset all OriginTV settings?")) resetSettings(); }} className="glass-chip mt-3 px-4 py-2 text-xs font-semibold hover:bg-white/10" style={{ color: "var(--destructive)" }}>
            Reset all settings
          </button>
        </Section>
      </div>
    </AppFrame>
  );
}
