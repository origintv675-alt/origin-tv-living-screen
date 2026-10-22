import {
  AlarmClock,
  AudioWaveform,
  CloudSun,
  Image as ImageIcon,
  LayoutGrid,
  Orbit as OrbitIcon,
  QrCode,
  Settings2,
  type LucideIcon,
} from "lucide-react";
import wallLock from "@/assets/wall-lock.jpg";
import wallJellyfish from "@/assets/wall-jellyfish.jpg";
import wallAurora from "@/assets/wall-aurora.jpg";
import wallHome from "@/assets/wall-home.jpg";

/* ---------- Wallpapers ---------- */

export type WallpaperId = "mountain" | "jellyfish" | "aurora" | "waves";

export interface Wallpaper {
  id: WallpaperId;
  name: string;
  src: string;
  live: boolean;
}

export const WALLPAPERS: Wallpaper[] = [
  { id: "mountain", name: "Summit Dusk", src: wallLock, live: false },
  { id: "jellyfish", name: "Abyss Glow", src: wallJellyfish, live: true },
  { id: "aurora", name: "Polar Night", src: wallAurora, live: true },
  { id: "waves", name: "Liquid Deep", src: wallHome, live: false },
];

export const wallpaperById = (id: WallpaperId): Wallpaper =>
  WALLPAPERS.find((w) => w.id === id) ?? WALLPAPERS[0]!;

/* ---------- Accents ---------- */

export type AccentId = "ice" | "violet" | "sunset" | "mint" | "rose" | "gold";

export const ACCENTS: { id: AccentId; name: string; oklch: string }[] = [
  { id: "ice", name: "Ice", oklch: "oklch(0.74 0.14 245)" },
  { id: "violet", name: "Violet", oklch: "oklch(0.68 0.19 292)" },
  { id: "sunset", name: "Sunset", oklch: "oklch(0.7 0.18 40)" },
  { id: "mint", name: "Mint", oklch: "oklch(0.78 0.15 165)" },
  { id: "rose", name: "Rose", oklch: "oklch(0.68 0.19 350)" },
  { id: "gold", name: "Gold", oklch: "oklch(0.8 0.15 85)" },
];

export const accentById = (id: AccentId) =>
  ACCENTS.find((a) => a.id === id) ?? ACCENTS[0];

/* ---------- Clock ---------- */

export type ClockStyle = "minimal" | "bold" | "analog" | "split";

export const CLOCK_FONTS = [
  { id: "sora", name: "Sora", stack: '"Sora", sans-serif' },
  { id: "grotesk", name: "Grotesk", stack: '"Space Grotesk", sans-serif' },
  { id: "serif", name: "Serif", stack: '"DM Serif Display", serif' },
  { id: "mono", name: "Mono", stack: '"JetBrains Mono", ui-monospace, monospace' },
];

export const clockFontStack = (id: string) =>
  (CLOCK_FONTS.find((f) => f.id === id) ?? CLOCK_FONTS[0]).stack;

export const CLOCK_COLORS = [
  { id: "white", name: "Pearl", value: "oklch(0.97 0.01 250)" },
  { id: "accent", name: "Accent", value: "var(--accent-live)" },
  { id: "sky", name: "Sky", value: "oklch(0.8 0.1 230)" },
  { id: "gold", name: "Gold", value: "oklch(0.85 0.12 85)" },
  { id: "rose", name: "Rose", value: "oklch(0.78 0.12 350)" },
];

/* ---------- Apps ---------- */

export type AppId =
  | "gallery"
  | "music"
  | "orbit"
  | "transfer"
  | "tools"
  | "weather"
  | "settings";

export interface AppDef {
  id: AppId;
  name: string;
  icon: LucideIcon;
  tint: string;
  tagline: string;
}

export const APPS: AppDef[] = [
  { id: "gallery", name: "Gallery", icon: ImageIcon, tint: "from-sky-400/70 to-blue-600/70", tagline: "Your cloud library" },
  { id: "music", name: "Music", icon: AudioWaveform, tint: "from-fuchsia-400/70 to-purple-600/70", tagline: "Play anything" },
  { id: "orbit", name: "Orbit AI", icon: OrbitIcon, tint: "from-violet-400/70 to-indigo-600/70", tagline: "Your assistant" },
  { id: "transfer", name: "Transfer", icon: QrCode, tint: "from-emerald-400/70 to-teal-600/70", tagline: "Send from your phone" },
  { id: "tools", name: "Tools", icon: LayoutGrid, tint: "from-amber-400/70 to-orange-600/70", tagline: "Alarms & modes" },
  { id: "weather", name: "Weather", icon: CloudSun, tint: "from-cyan-400/70 to-sky-600/70", tagline: "Forecast & UV" },
  { id: "settings", name: "Settings", icon: Settings2, tint: "from-slate-400/70 to-slate-600/70", tagline: "Personalize" },
];

export const appById = (id: AppId) => APPS.find((a) => a.id === id)!;

/* ---------- Music catalog ---------- */

export interface Track {
  id: string;
  title: string;
  artist: string;
  src: string;
  mood: string;
}

export const TRACKS: Track[] = [
  { id: "good-days", title: "Good Days", artist: "SZA", src: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3", mood: "Chill" },
  { id: "neon-drift", title: "Neon Drift", artist: "Aether", src: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3", mood: "Synthwave" },
  { id: "midnight", title: "Midnight Drive", artist: "Nova Lane", src: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3", mood: "Night" },
  { id: "sunrise", title: "Sunrise Protocol", artist: "KAIRO", src: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3", mood: "Uplift" },
  { id: "deep-focus", title: "Deep Focus", artist: "Monolith", src: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3", mood: "Focus" },
  { id: "aurora", title: "Aurora Fields", artist: "Yuki", src: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3", mood: "Ambient" },
  { id: "dreamer", title: "Dreamer", artist: "Soleil", src: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3", mood: "Dream" },
  { id: "velocity", title: "Velocity", artist: "Rift", src: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3", mood: "Energy" },
];

export const trackById = (id: string | null) =>
  TRACKS.find((t) => t.id === id) ?? null;

/* ---------- AOD quotes ---------- */

export const AOD_QUOTES = [
  "Better things are coming.",
  "Rest now. Shine later.",
  "The best view comes after the hardest climb.",
  "Dream in 4K.",
  "Every day is a fresh screen.",
  "Stay golden.",
];

/* ---------- Weather codes ---------- */

export function weatherInfo(code: number): {
  label: string;
  icon: "sun" | "cloud-sun" | "cloud" | "rain" | "snow" | "storm";
} {
  if (code === 0) return { label: "Clear", icon: "sun" };
  if (code <= 2) return { label: "Partly cloudy", icon: "cloud-sun" };
  if (code === 3) return { label: "Overcast", icon: "cloud" };
  if (code <= 48) return { label: "Fog", icon: "cloud" };
  if (code <= 57) return { label: "Drizzle", icon: "rain" };
  if (code <= 67) return { label: "Rain", icon: "rain" };
  if (code <= 77) return { label: "Snow", icon: "snow" };
  if (code <= 82) return { label: "Showers", icon: "rain" };
  if (code <= 86) return { label: "Snow", icon: "snow" };
  return { label: "Storm", icon: "storm" };
}

export function uvBand(uv: number): { label: string; color: string } {
  if (uv < 3) return { label: "Low", color: "oklch(0.78 0.15 165)" };
  if (uv < 6) return { label: "Moderate", color: "oklch(0.82 0.15 90)" };
  if (uv < 8) return { label: "High", color: "oklch(0.75 0.16 60)" };
  if (uv < 11) return { label: "Very High", color: "oklch(0.66 0.2 25)" };
  return { label: "Extreme", color: "oklch(0.6 0.25 300)" };
}
