import { useEffect, useMemo, useState } from "react";
import {
  Bell,
  Cloud,
  CloudSun,
  Music2,
  Pause,
  Play,
  Quote as QuoteIcon,
  SkipForward,
  Sun,
  Trash2,
  X,
  type LucideIcon,
} from "lucide-react";
import { useOs } from "@/os/store";
import { useMusic } from "@/os/music";
import { useWeather } from "@/os/useWeather";
import {
  AOD_QUOTES,
  CLOCK_COLORS,
  clockFontStack,
  uvBand,
  wallpaperById,
  weatherInfo,
} from "@/os/osData";

/* ---------- hooks & helpers ---------- */

export function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return now;
}

export function clockColorValue(id: string) {
  return (CLOCK_COLORS.find((c) => c.id === id) ?? CLOCK_COLORS[0]!).value;
}

export function formatDay(now: Date) {
  return now.toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

/* ---------- wallpaper ---------- */

export function WallpaperBg({ dim = 0 }: { dim?: number }) {
  const { wallpaper, liveWallpaper } = useOs((s) => s.settings);
  const wp = wallpaperById(wallpaper);
  return (
    <div className="absolute inset-0 overflow-hidden bg-background">
      <img
        src={wp.src}
        alt=""
        className={`h-full w-full object-cover ${liveWallpaper ? "live-wallpaper" : ""}`}
      />
      <div
        className="absolute inset-0"
        style={{ background: `oklch(0.1 0.03 265 / ${0.2 + dim})` }}
      />
    </div>
  );
}

/* ---------- clock ---------- */

function AnalogClock({ now, size }: { now: Date; size: number }) {
  const { clockColor } = useOs((s) => s.settings);
  const color = clockColorValue(clockColor);
  const h = (now.getHours() % 12) + now.getMinutes() / 60;
  const m = now.getMinutes() + now.getSeconds() / 60;
  const sec = now.getSeconds();
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" className="glow-text">
      <circle cx="50" cy="50" r="46" fill="oklch(1 0 0 / 0.06)" stroke={color} strokeOpacity="0.25" strokeWidth="1.5" />
      {Array.from({ length: 12 }).map((_, i) => (
        <line
          key={i}
          x1="50"
          y1="8"
          x2="50"
          y2="13"
          stroke={color}
          strokeOpacity="0.5"
          strokeWidth="1.6"
          transform={`rotate(${i * 30} 50 50)`}
        />
      ))}
      <line x1="50" y1="52" x2="50" y2="27" stroke={color} strokeWidth="4" strokeLinecap="round" transform={`rotate(${h * 30} 50 50)`} />
      <line x1="50" y1="54" x2="50" y2="17" stroke={color} strokeWidth="2.4" strokeLinecap="round" transform={`rotate(${m * 6} 50 50)`} />
      <line x1="50" y1="58" x2="50" y2="15" stroke="var(--accent-live)" strokeWidth="1.2" strokeLinecap="round" transform={`rotate(${sec * 6} 50 50)`} />
      <circle cx="50" cy="50" r="2.6" fill="var(--accent-live)" />
    </svg>
  );
}

export function Clock({ now, size = "lg" }: { now: Date; size?: "lg" | "md" | "sm" }) {
  const s = useOs((st) => st.settings);
  if (s.clockStyle === "analog") {
    return <AnalogClock now={now} size={size === "lg" ? 300 : size === "md" ? 170 : 96} />;
  }
  const font = clockFontStack(s.clockFont);
  const color = clockColorValue(s.clockColor);
  const h24 = now.getHours();
  const h12 = h24 % 12 || 12;
  const mm = String(now.getMinutes()).padStart(2, "0");
  const suffix = s.use24h ? "" : h24 < 12 ? "AM" : "PM";
  const label = s.use24h ? `${String(h24).padStart(2, "0")}:${mm}` : `${h12}:${mm}`;

  if (size === "lg" && s.clockStyle === "split") {
    return (
      <div style={{ fontFamily: font, color }} className="glow-text flex items-end leading-none">
        <span className="text-[15vw] font-extrabold">{s.use24h ? String(h24).padStart(2, "0") : h12}</span>
        <span className="mb-[1.6vw] flex flex-col gap-[0.6vw] pl-[1.2vw]">
          <span className="text-[4.6vw] font-semibold tracking-widest" style={{ color: "var(--accent-live)" }}>
            {mm}
          </span>
          {suffix && <span className="text-[2.2vw] font-medium opacity-80">{suffix}</span>}
        </span>
      </div>
    );
  }
  const weight = s.clockStyle === "bold" ? "font-black" : "font-light";
  const scale = size === "lg" ? "text-[12vw]" : size === "md" ? "text-6xl" : "text-2xl";
  return (
    <div style={{ fontFamily: font, color }} className={`glow-text leading-none ${weight} ${scale}`}>
      {label}
      {suffix && size !== "sm" && (
        <span className="ml-3 align-top text-[0.28em] font-medium opacity-80">{suffix}</span>
      )}
    </div>
  );
}

/* ---------- boot ---------- */

export function BootScreen() {
  return (
    <div className="anim-fade flex h-screen flex-col items-center justify-center gap-7 bg-black">
      <div
        className="orb-spin h-16 w-16 rounded-full border-2 border-transparent"
        style={{ borderTopColor: "var(--accent-live)", borderRightColor: "var(--accent-live)" }}
      />
      <p className="glow-text text-3xl font-extrabold tracking-[0.55em]" style={{ color: "var(--accent-live)" }}>
        ORIGIN
      </p>
      <p className="text-xs tracking-[0.4em] text-muted-foreground">TV OS STARTING</p>
    </div>
  );
}

/* ---------- lock screen widgets ---------- */

function WeatherChip() {
  const { data: w } = useWeather();
  if (!w) return null;
  const info = weatherInfo(w.code);
  const Icon = info.icon === "sun" ? Sun : info.icon === "cloud-sun" ? CloudSun : info.icon === "rain" ? Cloud : Cloud;
  return (
    <div className="glass-chip flex items-center gap-2.5 px-4 py-2.5">
      <Icon className="h-5 w-5" style={{ color: "var(--accent-live)" }} />
      <span className="text-lg font-semibold">{w.temp}°</span>
      <span className="text-xs text-muted-foreground">{w.city}</span>
    </div>
  );
}

function UvChip() {
  const { data: w } = useWeather();
  if (!w) return null;
  const band = uvBand(w.uv);
  return (
    <div className="glass-chip flex items-center gap-2.5 px-4 py-2.5">
      <Sun className="h-5 w-5" style={{ color: band.color }} />
      <span className="text-sm font-semibold">UV {w.uv}</span>
      <span className="text-xs" style={{ color: band.color }}>
        {band.label}
      </span>
    </div>
  );
}

function MusicChip() {
  const music = useMusic();
  if (!music.currentId) return null;
  const track = music.current();
  return (
    <div className="glass-chip flex max-w-xs items-center gap-3 px-4 py-2.5">
      <div className="flex h-4 items-end gap-[3px]">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className={`h-3 w-[3px] rounded-full ${music.playing ? "wave-bar" : ""}`}
            style={{ background: "var(--accent-live)", animationDelay: `${i * 0.18}s` }}
          />
        ))}
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{track?.title}</p>
        <p className="truncate text-xs text-muted-foreground">{track?.artist}</p>
      </div>
      <button
        onClick={(e) => {
          e.stopPropagation();
          music.toggle();
        }}
        className="rounded-full p-1.5 hover:bg-white/10"
        aria-label={music.playing ? "Pause" : "Play"}
      >
        {music.playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
      </button>
      <button
        onClick={(e) => {
          e.stopPropagation();
          music.next();
        }}
        className="rounded-full p-1.5 hover:bg-white/10"
        aria-label="Next track"
      >
        <SkipForward className="h-4 w-4" />
      </button>
    </div>
  );
}

function QuoteChip() {
  const idx = useMemo(() => Math.floor(Math.random() * AOD_QUOTES.length), []);
  return (
    <div className="glass-chip flex max-w-md items-center gap-2.5 px-4 py-2.5">
      <QuoteIcon className="h-4 w-4 shrink-0" style={{ color: "var(--accent-live)" }} />
      <p className="text-sm italic text-muted-foreground">{AOD_QUOTES[idx]}</p>
    </div>
  );
}

function CalendarChip({ now }: { now: Date }) {
  return (
    <div className="glass-chip flex items-center gap-3 px-4 py-2.5">
      <div className="text-center">
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
          {now.toLocaleDateString(undefined, { month: "short" })}
        </p>
        <p className="text-xl font-bold leading-none">{now.getDate()}</p>
      </div>
      <div className="h-8 w-px bg-border" />
      <div>
        <p className="text-sm font-medium">{now.toLocaleDateString(undefined, { weekday: "long" })}</p>
        <p className="text-xs text-muted-foreground">No events today</p>
      </div>
    </div>
  );
}

/* ---------- lock screen ---------- */

export function LockScreen() {
  const now = useNow();
  const { lockWidgets, profileName, profileAvatar } = useOs((s) => s.settings);
  const notifications = useOs((s) => s.notifications);
  return (
    <div className="relative h-screen overflow-hidden">
      <WallpaperBg dim={0.1} />
      <div className="anim-fade relative flex h-full flex-col items-center justify-center">
        {/* Depth clock: sits behind the glass widget bar */}
        <div className="pointer-events-none absolute inset-x-0 top-[10%] flex flex-col items-center">
          <Clock now={now} />
          <p className="mt-2 text-lg font-medium text-muted-foreground glow-text">{formatDay(now)}</p>
        </div>

        {/* Glass widget bar overlapping the clock — the clock refracts through it */}
        <div className="glass-soft floaty relative z-10 mt-[16vh] flex max-w-[92vw] flex-wrap items-center justify-center gap-3 px-6 py-4">
          {lockWidgets.weather && <WeatherChip />}
          {lockWidgets.uv && <UvChip />}
          {lockWidgets.music && <MusicChip />}
          {lockWidgets.quote && <QuoteChip />}
          {lockWidgets.calendar && <CalendarChip now={now} />}
        </div>

        <div className="absolute bottom-10 flex flex-col items-center gap-4">
          {profileAvatar && (
            <div className="glass-chip flex items-center gap-2 px-4 py-2 text-sm">
              <span className="text-lg">{profileAvatar}</span>
              <span className="font-medium">{profileName}</span>
            </div>
          )}
          <p className="glass-chip px-5 py-2 text-xs tracking-[0.25em] text-muted-foreground">
            PRESS ANY KEY OR CLICK TO UNLOCK
          </p>
          {notifications.length > 0 && (
            <div className="glass-chip flex items-center gap-2 px-3 py-1.5 text-xs">
              <Bell className="h-3.5 w-3.5" style={{ color: "var(--accent-live)" }} />
              {notifications.length} notification{notifications.length > 1 ? "s" : ""}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------- PIN ---------- */

export function PinPad() {
  const pin = useOs((s) => s.settings.pin);
  const unlock = useOs((s) => s.unlock);
  const cancel = useOs((s) => s.cancelPin);
  const [entry, setEntry] = useState("");
  const [error, setError] = useState(false);

  useEffect(() => {
    if (entry.length !== 4) return;
    if (entry === pin) {
      unlock();
    } else {
      setError(true);
      const t = setTimeout(() => {
        setEntry("");
        setError(false);
      }, 650);
      return () => clearTimeout(t);
    }
  }, [entry, pin, unlock]);

  const press = (d: string) => {
    if (error) return;
    setEntry((e) => (e.length < 4 ? e + d : e));
  };

  return (
    <div className="relative h-screen overflow-hidden">
      <WallpaperBg dim={0.55} />
      <div className="anim-screen relative flex h-full flex-col items-center justify-center gap-8">
        <p className="text-sm tracking-[0.3em] text-muted-foreground">ENTER PIN</p>
        <div className={`flex gap-4 ${error ? "animate-pulse" : ""}`}>
          {[0, 1, 2, 3].map((i) => (
            <span
              key={i}
              className="glass h-5 w-5 rounded-full"
              style={{
                background: error
                  ? "var(--destructive)"
                  : i < entry.length
                    ? "var(--accent-live)"
                    : undefined,
              }}
            />
          ))}
        </div>
        {error && <p className="text-sm text-destructive">Wrong PIN, try again</p>}
        <div className="grid grid-cols-3 gap-3">
          {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
            <button key={d} data-tv-focus onClick={() => press(d)} className="glass h-16 w-16 text-xl font-semibold hover:bg-white/10">
              {d}
            </button>
          ))}
          <button data-tv-focus onClick={cancel} className="glass h-16 w-16 text-xs font-medium hover:bg-white/10">
            Cancel
          </button>
          <button data-tv-focus onClick={() => press("0")} className="glass h-16 w-16 text-xl font-semibold hover:bg-white/10">
            0
          </button>
          <button
            data-tv-focus
            onClick={() => setEntry("")}
            className="glass h-16 w-16 text-xs font-medium hover:bg-white/10"
          >
            Clear
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------- AOD ---------- */

export function AodScreen() {
  const now = useNow(10000);
  const { aodDynamic, lockWidgets } = useOs((s) => s.settings);
  const [qi, setQi] = useState(() => Math.floor(Math.random() * AOD_QUOTES.length));
  useEffect(() => {
    if (!aodDynamic) return;
    const t = setInterval(() => setQi((i) => (i + 1) % AOD_QUOTES.length), 25000);
    return () => clearInterval(t);
  }, [aodDynamic]);
  return (
    <div className="anim-fade flex h-screen flex-col items-center justify-center gap-6 bg-black">
      <Clock now={now} size="md" />
      {lockWidgets.quote && (
        <p className="breathe max-w-md text-center text-sm italic text-muted-foreground">{AOD_QUOTES[qi]}</p>
      )}
      <p className="text-[10px] tracking-[0.4em] text-muted-foreground/60">ORIGINTV</p>
    </div>
  );
}

/* ---------- screensaver ---------- */

export function Screensaver() {
  const { screensaverStyle, wallpaper } = useOs((s) => s.settings);
  const wp = wallpaperById(wallpaper);
  const bubbles = useMemo(
    () =>
      Array.from({ length: 26 }, (_, i) => ({
        left: (i * 37) % 100,
        size: 6 + ((i * 13) % 30),
        delay: (i % 10) * 1.7,
        dur: 12 + (i % 7) * 3,
      })),
    [],
  );
  if (screensaverStyle === "jellyfish") {
    return (
      <div className="relative h-screen overflow-hidden bg-black">
        <img src={wp.src} alt="" className="h-full w-full object-cover opacity-40" />
        {bubbles.map((b, i) => (
          <span
            key={i}
            className="absolute bottom-0 rounded-full"
            style={{
              left: `${b.left}%`,
              width: b.size,
              height: b.size,
              background: "var(--glow-soft)",
              border: "1px solid var(--glass-line)",
              animation: `bubble-float ${b.dur}s linear ${b.delay}s infinite`,
            }}
          />
        ))}
      </div>
    );
  }
  return (
    <div className="relative h-screen overflow-hidden bg-black">
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          className="aurora-band absolute inset-x-[-10%] blur-3xl"
          style={{
            top: `${i * 24}%`,
            height: "32%",
            background: `radial-gradient(ellipse at ${20 + i * 20}% 50%, var(--glow-soft), transparent 65%)`,
            animationDelay: `${i * 2.4}s`,
          }}
        />
      ))}
      <div className="absolute inset-0 flex items-center justify-center">
        <p className="glow-text text-sm tracking-[0.5em] text-muted-foreground">ORIGINTV</p>
      </div>
    </div>
  );
}

/* ---------- notifications ---------- */

export function NotificationsPanel({ onClose }: { onClose: () => void }) {
  const notifications = useOs((s) => s.notifications);
  const dismiss = useOs((s) => s.dismissNotification);
  return (
    <div className="glass anim-screen absolute right-6 top-16 z-40 flex max-h-[60vh] w-96 flex-col overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3">
        <p className="text-sm font-semibold">Notifications</p>
        <button onClick={onClose} className="rounded-full p-1.5 hover:bg-white/10" aria-label="Close notifications">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-3">
        {notifications.length === 0 ? (
          <p className="px-2 py-6 text-center text-sm text-muted-foreground">You're all caught up</p>
        ) : (
          notifications.map((n) => (
            <div key={n.id} className="glass-soft mb-2 flex items-start gap-3 px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{n.title}</p>
                <p className="truncate text-xs text-muted-foreground">{n.body}</p>
              </div>
              <span className="text-[10px] text-muted-foreground">{n.time}</span>
              <button onClick={() => dismiss(n.id)} className="rounded-full p-1 hover:bg-white/10" aria-label="Dismiss">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

/* ---------- home ---------- */

export function HomeScreen({ onToggleBell }: { onToggleBell: () => void }) {
  const now = useNow();
  const openApp = useOs((s) => s.openApp);
  const settings = useOs((s) => s.settings);
  const notifications = useOs((s) => s.notifications);
  const { data: w } = useWeather();
  const music = useMusic();
  const Icon = music.playing ? Pause : Play;
  const WIcon = w ? (weatherInfo(w.code).icon === "sun" ? Sun : weatherInfo(w.code).icon === "cloud-sun" ? CloudSun : Cloud) : Cloud;

  return (
    <div className="relative h-screen overflow-hidden">
      <WallpaperBg dim={0.3} />
      <div className="anim-screen relative flex h-full flex-col p-8">
        {/* top bar */}
        <header className="flex items-center justify-between">
          <Clock now={now} size="sm" />
          <div className="flex items-center gap-3">
            {w && (
              <div className="glass-chip flex items-center gap-2 px-4 py-2 text-sm">
                <WIcon className="h-4 w-4" style={{ color: "var(--accent-live)" }} />
                {w.temp}° {w.city}
              </div>
            )}
            {settings.dnd && <div className="glass-chip px-3 py-2 text-xs">Do Not Disturb</div>}
            <button
              data-tv-focus
              onClick={onToggleBell}
              className="glass-chip relative p-2.5 hover:bg-white/10"
              aria-label="Notifications"
            >
              <Bell className="h-4 w-4" />
              {notifications.length > 0 && (
                <span
                  className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full"
                  style={{ background: "var(--accent-live)" }}
                />
              )}
            </button>
          </div>
        </header>

        <div className="mt-6 flex min-h-0 flex-1 gap-6">
          {/* widget column */}
          <div className="flex w-[30%] flex-col gap-4">
            <div className="glass flex flex-1 flex-col items-center justify-center gap-1 p-6">
              <span className="floaty text-5xl">{settings.profileAvatar}</span>
              <p className="mt-2 text-xl font-bold">{settings.profileName}</p>
              <p className="text-sm text-muted-foreground">{settings.profileStatus}</p>
            </div>
            {settings.homeWidgets.weather && w && (
              <button
                data-tv-focus
                onClick={() => openApp("weather")}
                className="glass tv-tile flex items-center gap-4 p-5 text-left"
              >
                <WIcon className="h-9 w-9" style={{ color: "var(--accent-live)" }} />
                <div>
                  <p className="text-2xl font-bold">{w.temp}°</p>
                  <p className="text-xs text-muted-foreground">
                    Feels {w.feelsLike}° · {weatherInfo(w.code).label}
                  </p>
                </div>
              </button>
            )}
            {settings.homeWidgets.uv && w && (
              <div className="glass flex items-center gap-4 p-5">
                <Sun className="h-9 w-9" style={{ color: uvBand(w.uv).color }} />
                <div>
                  <p className="text-lg font-semibold">UV {w.uv}</p>
                  <p className="text-xs" style={{ color: uvBand(w.uv).color }}>
                    {uvBand(w.uv).label}
                  </p>
                </div>
              </div>
            )}
            {settings.homeWidgets.music && (
              <div className="glass flex items-center gap-4 p-5">
                <Music2 className="h-8 w-8 shrink-0" style={{ color: "var(--accent-live)" }} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{music.current()?.title ?? "Nothing playing"}</p>
                  <p className="truncate text-xs text-muted-foreground">{music.current()?.artist ?? "Open Music"}</p>
                </div>
                <button
                  data-tv-focus
                  onClick={() => music.toggle()}
                  className="glass-chip p-2.5 hover:bg-white/10"
                  aria-label="Toggle playback"
                >
                  <Icon className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>

          {/* app grid */}
          <div className="grid min-h-0 flex-1 grid-cols-4 grid-rows-2 gap-4">
            {settings.homeWidgets.clock && (
              <div className="glass col-span-2 row-span-2 flex flex-col items-center justify-center p-6">
                <Clock now={now} size="md" />
                <p className="mt-3 text-sm text-muted-foreground">{formatDay(now)}</p>
              </div>
            )}
            {settings.homeWidgets.profile && (
              <button
                data-tv-focus
                onClick={() => openApp("settings")}
                className="glass tv-tile flex flex-col items-start justify-end p-5 text-left"
              >
                <span className="mb-2 text-3xl">{settings.profileAvatar}</span>
                <p className="text-sm font-semibold">Profile</p>
                <p className="text-xs text-muted-foreground">{settings.profileName}</p>
              </button>
            )}
            {settings.homeWidgets.profile && (
              <button
                data-tv-focus
                onClick={() => openApp("transfer")}
                className="glass tv-tile flex flex-col items-start justify-end p-5 text-left"
              >
                <span className="mb-2 text-2xl">📲</span>
                <p className="text-sm font-semibold">Send from phone</p>
                <p className="text-xs text-muted-foreground">Scan the code</p>
              </button>
            )}
          </div>
        </div>

        {/* app dock */}
        <footer className="mt-5 flex items-center justify-center gap-3">
          {(
            [
              ["gallery", "🖼️", "Gallery"],
              ["music", "🎵", "Music"],
              ["orbit", "✨", "Orbit AI"],
              ["transfer", "📡", "Transfer"],
              ["tools", "🧰", "Tools"],
              ["weather", "🌤️", "Weather"],
              ["settings", "⚙️", "Settings"],
            ] as const
          ).map(([id, emoji, name]) => (
            <button
              key={id}
              data-tv-focus
              onClick={() => openApp(id as never)}
              className="glass tv-tile flex flex-col items-center gap-1.5 px-6 py-3"
            >
              <span className="text-2xl">{emoji}</span>
              <span className="text-xs font-medium">{name}</span>
            </button>
          ))}
        </footer>
      </div>
    </div>
  );
}

/* weather details used by the Weather app */

export function WeatherDetailRow({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="glass flex items-center gap-4 p-5">
      <Icon className="h-6 w-6" style={{ color: "var(--accent-live)" }} />
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-lg font-semibold">{value}</p>
      </div>
    </div>
  );
}
