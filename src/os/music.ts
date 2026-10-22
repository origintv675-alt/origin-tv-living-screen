import { create } from "zustand";
import { TRACKS, trackById, type Track } from "./osData";

interface MusicState {
  currentId: string | null;
  playing: boolean;
  shuffle: boolean;
  progress: number; // 0..1
  duration: number;
  play: (id?: string) => void;
  toggle: () => void;
  next: () => void;
  prev: () => void;
  setShuffle: (v: boolean) => void;
  sync: (progress: number, duration: number, playing: boolean) => void;
  current: () => Track | null;
}

let audio: HTMLAudioElement | null = null;

function el(): HTMLAudioElement | null {
  if (typeof window === "undefined") return null;
  if (!audio) {
    audio = new Audio();
    audio.preload = "auto";
  }
  return audio;
}

export const useMusic = create<MusicState>()((set, get) => ({
  currentId: null,
  playing: false,
  shuffle: false,
  progress: 0,
  duration: 0,

  current: () => trackById(get().currentId),

  play: (id) => {
    const a = el();
    if (!a) return;
    const nextId = id ?? get().currentId ?? TRACKS[0].id;
    if (nextId !== get().currentId) {
      a.src = trackById(nextId)?.src ?? TRACKS[0].src;
      set({ currentId: nextId, progress: 0 });
    }
    a.play().catch(() => set({ playing: false }));
    set({ playing: true });
  },

  toggle: () => {
    const a = el();
    if (!a) return;
    if (!get().currentId) {
      get().play(TRACKS[0].id);
      return;
    }
    if (get().playing) {
      a.pause();
      set({ playing: false });
    } else {
      a.play().catch(() => set({ playing: false }));
      set({ playing: true });
    }
  },

  next: () => {
    const { shuffle, currentId } = get();
    const idx = TRACKS.findIndex((t) => t.id === currentId);
    const nextIdx = shuffle
      ? Math.floor(Math.random() * TRACKS.length)
      : (idx + 1) % TRACKS.length;
    get().play(TRACKS[nextIdx].id);
  },

  prev: () => {
    const idx = TRACKS.findIndex((t) => t.id === get().currentId);
    const prevIdx = (idx - 1 + TRACKS.length) % TRACKS.length;
    get().play(TRACKS[prevIdx].id);
  },

  setShuffle: (v) => set({ shuffle: v }),

  sync: (progress, duration, playing) => set({ progress, duration, playing }),

  stop: () => {
    const a = el();
    if (a) a.pause();
    set({ playing: false });
  },
}));

/** Seek helper used by player UI. */
export function seekTo(fraction: number) {
  const a = el();
  if (!a || !a.duration || Number.isNaN(a.duration)) return;
  a.currentTime = fraction * a.duration;
}

/** Volume control is owned by OS settings; engine reads it through this. */
export function setEngineVolume(volume: number) {
  const a = el();
  if (a) a.volume = Math.min(1, Math.max(0, volume / 100));
}

/** Wire element events to the store; call once from a client component. */
export function attachMusicEngine() {
  const a = el();
  if (!a) return () => {};
  const onTime = () => {
    const dur = a.duration && !Number.isNaN(a.duration) ? a.duration : 0;
    useMusic.getState().sync(dur > 0 ? a.currentTime / dur : 0, dur, !a.paused);
    if (dur > 0 && a.currentTime >= dur - 0.15) useMusic.getState().next();
  };
  const onPlay = () => useMusic.getState().sync(useMusic.getState().progress, a.duration || 0, true);
  const onPause = () => useMusic.getState().sync(useMusic.getState().progress, a.duration || 0, false);
  a.addEventListener("timeupdate", onTime);
  a.addEventListener("play", onPlay);
  a.addEventListener("pause", onPause);
  return () => {
    a.removeEventListener("timeupdate", onTime);
    a.removeEventListener("play", onPlay);
    a.removeEventListener("pause", onPause);
  };
}
