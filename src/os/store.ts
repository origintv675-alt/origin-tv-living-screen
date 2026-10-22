import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AccentId, AppId, ClockStyle, WallpaperId } from "./osData";

export interface LockWidgets {
  weather: boolean;
  uv: boolean;
  music: boolean;
  quote: boolean;
  calendar: boolean;
}

export interface HomeWidgets {
  clock: boolean;
  weather: boolean;
  uv: boolean;
  music: boolean;
  profile: boolean;
}

export interface OsSettings {
  /* Personalization */
  clockStyle: ClockStyle;
  clockFont: string;
  clockColor: string;
  use24h: boolean;
  wallpaper: WallpaperId;
  liveWallpaper: boolean;
  accent: AccentId;

  /* Display & sound */
  brightness: number;
  volume: number;
  pictureMode: "standard" | "vivid" | "cinema" | "eco";

  /* Modes */
  eyeProtection: boolean;
  colorInversion: boolean;
  dnd: boolean;
  bedtimeEnabled: boolean;
  bedtimeFrom: string;
  bedtimeTo: string;
  batterySaver: boolean;
  superBatterySaver: boolean;

  /* Lock screen */
  lockWidgets: LockWidgets;
  pinEnabled: boolean;
  pin: string;

  /* Home */
  homeWidgets: HomeWidgets;
  profileName: string;
  profileStatus: string;
  profileAvatar: string;

  /* Idle behaviour */
  autoLockMin: number;
  screensaverEnabled: boolean;
  screensaverAfterMin: number;
  screensaverStyle: "aurora" | "jellyfish";
  aodEnabled: boolean;
  aodDynamic: boolean;

  /* Weather location */
  weatherCity: string;
  weatherLat: number;
  weatherLon: number;
}

export const DEFAULT_SETTINGS: OsSettings = {
  clockStyle: "minimal",
  clockFont: "sora",
  clockColor: "white",
  use24h: false,
  wallpaper: "mountain",
  liveWallpaper: true,
  accent: "ice",

  brightness: 78,
  volume: 40,
  pictureMode: "standard",

  eyeProtection: false,
  colorInversion: false,
  dnd: false,
  bedtimeEnabled: false,
  bedtimeFrom: "22:00",
  bedtimeTo: "06:00",
  batterySaver: false,
  superBatterySaver: false,

  lockWidgets: { weather: true, uv: true, music: false, quote: true, calendar: true },
  pinEnabled: false,
  pin: "",

  homeWidgets: { clock: true, weather: true, uv: true, music: true, profile: true },
  profileName: "Dreamer",
  profileStatus: "Welcome back",
  profileAvatar: "🧑‍🚀",

  autoLockMin: 20,
  screensaverEnabled: true,
  screensaverAfterMin: 3,
  screensaverStyle: "aurora",
  aodEnabled: true,
  aodDynamic: true,

  weatherCity: "Mumbai",
  weatherLat: 19.076,
  weatherLon: 72.8777,
};

export interface OsNotification {
  id: string;
  title: string;
  body: string;
  time: string;
}

export interface RingingAlarm {
  key: string;
  label: string;
}

interface OsState {
  /* ---- persisted settings ---- */
  settings: OsSettings;
  update: (patch: Partial<OsSettings>) => void;
  updateLockWidgets: (patch: Partial<LockWidgets>) => void;
  updateHomeWidgets: (patch: Partial<HomeWidgets>) => void;
  resetSettings: () => void;

  /* ---- volatile session ---- */
  phase: "boot" | "lock" | "home" | "app" | "aod" | "screensaver" | "pin";
  activeApp: AppId | null;
  notifications: OsNotification[];
  ringing: RingingAlarm | null;

  boot: () => void;
  lock: () => void;
  requestUnlock: () => void;
  cancelPin: () => void;
  unlock: () => void;
  openApp: (app: AppId) => void;
  goHome: () => void;
  enterAod: () => void;
  enterScreensaver: () => void;
  wake: () => void;
  notify: (title: string, body: string) => void;
  dismissNotification: (id: string) => void;
  setRinging: (r: RingingAlarm | null) => void;
}

export const useOs = create<OsState>()(
  persist(
    (set, get) => ({
      settings: DEFAULT_SETTINGS,
      update: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),
      updateLockWidgets: (patch) =>
        set((s) => ({ settings: { ...s.settings, lockWidgets: { ...s.settings.lockWidgets, ...patch } } })),
      updateHomeWidgets: (patch) =>
        set((s) => ({ settings: { ...s.settings, homeWidgets: { ...s.settings.homeWidgets, ...patch } } })),
      resetSettings: () => set({ settings: DEFAULT_SETTINGS }),

      phase: "boot",
      activeApp: null,
      notifications: [],
      ringing: null,

      boot: () => set({ phase: "lock" }),
      lock: () => set({ phase: "lock", activeApp: null }),
      requestUnlock: () => {
        const { settings } = get();
        if (settings.pinEnabled && settings.pin) set({ phase: "pin" });
        else set({ phase: "home" });
      },
      cancelPin: () => set({ phase: "lock" }),
      unlock: () => set({ phase: "home" }),
      openApp: (app) => set({ phase: "app", activeApp: app }),
      goHome: () => set({ phase: "home", activeApp: null }),
      enterAod: () => set({ phase: "aod" }),
      enterScreensaver: () => set({ phase: "screensaver" }),
      wake: () => set({ phase: "lock", activeApp: null }),
      notify: (title, body) =>
        set((s) => ({
          notifications: [
            { id: crypto.randomUUID(), title, body, time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) },
            ...s.notifications,
          ].slice(0, 20),
        })),
      dismissNotification: (id) =>
        set((s) => ({ notifications: s.notifications.filter((n) => n.id !== id) })),
      setRinging: (r) => set({ ringing: r }),
    }),
    {
      name: "origintv-settings",
      partialize: (s) => ({ settings: s.settings }),
    },
  ),
);
