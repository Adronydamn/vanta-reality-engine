"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type {
  ArtifactRecord,
  FieldMode,
  ModeParams,
  PaletteId,
  PerformanceSettings,
  PostSettings,
  SceneConfig,
} from "@/types/vanta";
import { cloneModeParams, DEFAULT_MODE_PARAMS, DEFAULT_POST, PARTICLES_MIN, randomSeed } from "./presets";
import { detectDevice, type DeviceProfile } from "./performance";
import { PALETTES } from "./palettes";

const MAX_ARTIFACTS = 16;

interface PersistedState {
  mode: FieldMode;
  palette: PaletteId;
  modeParams: Record<FieldMode, ModeParams>;
  particleCount: number;
  post: PostSettings;
  performance: PerformanceSettings;
  worldSeed: string;
  artifacts: ArtifactRecord[];
  captureCounter: number;
}

interface RuntimeState {
  device: DeviceProfile;
  paused: boolean;
  capturing: boolean;
  panelOpen: boolean;
  dpr: number;
  /** Particle cap imposed by the adaptive performance monitor */
  autoParticleCap: number;
  tabHidden: boolean;
  toast: string | null;
  /** Incremented to signal a world reset to scene components */
  resetNonce: number;
}

interface Actions {
  setMode: (mode: FieldMode) => void;
  setPalette: (palette: PaletteId) => void;
  setModeParam: (key: keyof ModeParams, value: number) => void;
  setParticleCount: (count: number) => void;
  setPost: (patch: Partial<PostSettings>) => void;
  setPerformance: (patch: Partial<PerformanceSettings>) => void;
  setPaused: (paused: boolean) => void;
  togglePause: () => void;
  setCapturing: (capturing: boolean) => void;
  setPanelOpen: (open: boolean) => void;
  setDpr: (dpr: number) => void;
  setAutoParticleCap: (cap: number) => void;
  setTabHidden: (hidden: boolean) => void;
  showToast: (message: string | null) => void;
  setWorldSeed: (seed: string) => void;
  resetWorld: () => void;
  factoryReset: () => void;
  addArtifact: (config: SceneConfig) => ArtifactRecord;
  findArtifact: (seed: string) => ArtifactRecord | undefined;
  applyConfig: (config: SceneConfig) => void;
}

export type VantaState = PersistedState & RuntimeState & Actions;

const device = detectDevice();

function defaults(): PersistedState {
  return {
    mode: "gravity",
    palette: "vanta",
    modeParams: cloneModeParams(DEFAULT_MODE_PARAMS),
    particleCount: device.defaultParticles,
    post: { ...DEFAULT_POST, bloom: !device.mobile || !device.lowEnd },
    performance: { adaptive: true, maxDpr: device.maxDpr },
    worldSeed: randomSeed(),
    artifacts: [],
    captureCounter: 0,
  };
}

const clampParticles = (n: number) => Math.round(Math.min(device.maxParticles, Math.max(PARTICLES_MIN, n)));

export const useVantaStore = create<VantaState>()(
  persist(
    (set, get) => ({
      ...defaults(),
      device,
      paused: false,
      capturing: false,
      panelOpen: !device.mobile,
      dpr: 1,
      autoParticleCap: device.maxParticles,
      tabHidden: false,
      toast: null,
      resetNonce: 0,

      setMode: (mode) => set({ mode }),
      setPalette: (palette) => set({ palette }),
      setModeParam: (key, value) =>
        set((s) => ({ modeParams: { ...s.modeParams, [s.mode]: { ...s.modeParams[s.mode], [key]: value } } })),
      setParticleCount: (count) => set({ particleCount: clampParticles(count) }),
      setPost: (patch) => set((s) => ({ post: { ...s.post, ...patch } })),
      setPerformance: (patch) => set((s) => ({ performance: { ...s.performance, ...patch } })),
      setPaused: (paused) => set({ paused }),
      togglePause: () => set((s) => ({ paused: !s.paused })),
      setCapturing: (capturing) => set({ capturing }),
      setPanelOpen: (panelOpen) => set({ panelOpen }),
      setDpr: (dpr) => set({ dpr }),
      setAutoParticleCap: (cap) => set({ autoParticleCap: clampParticles(cap) }),
      setTabHidden: (tabHidden) => set({ tabHidden }),
      showToast: (toast) => set({ toast }),
      setWorldSeed: (worldSeed) => set({ worldSeed }),
      resetWorld: () => set((s) => ({ resetNonce: s.resetNonce + 1, paused: false })),
      factoryReset: () =>
        set((s) => ({
          ...defaults(),
          artifacts: s.artifacts,
          captureCounter: s.captureCounter,
          autoParticleCap: device.maxParticles,
          resetNonce: s.resetNonce + 1,
          paused: false,
        })),
      addArtifact: (config) => {
        const number = get().captureCounter + 1;
        const taken = new Set(get().artifacts.map((a) => a.seed));
        let seed = randomSeed();
        while (taken.has(seed)) seed = randomSeed();
        const record: ArtifactRecord = {
          id: `${number}-${seed}-${Date.now()}`,
          seed,
          number,
          createdAt: Date.now(),
          config,
        };
        set((s) => ({ captureCounter: number, artifacts: [record, ...s.artifacts].slice(0, MAX_ARTIFACTS) }));
        return record;
      },
      findArtifact: (seed) => {
        const needle = seed.trim().toLowerCase();
        return get().artifacts.find((a) => a.seed === needle);
      },
      applyConfig: (config) =>
        set({
          mode: config.mode,
          palette: PALETTES[config.palette] ? config.palette : "vanta",
          modeParams: cloneModeParams(config.modeParams),
          particleCount: clampParticles(config.particleCount),
          post: { ...DEFAULT_POST, ...config.post },
          worldSeed: config.worldSeed,
        }),
    }),
    {
      name: "vanta-reality-engine",
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (s): PersistedState => ({
        mode: s.mode,
        palette: s.palette,
        modeParams: s.modeParams,
        particleCount: s.particleCount,
        post: s.post,
        performance: s.performance,
        worldSeed: s.worldSeed,
        artifacts: s.artifacts,
        captureCounter: s.captureCounter,
      }),
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<PersistedState>;
        return {
          ...current,
          ...p,
          modeParams: { ...cloneModeParams(DEFAULT_MODE_PARAMS), ...p.modeParams },
          post: { ...current.post, ...p.post },
          performance: { ...current.performance, ...p.performance },
          particleCount: clampParticles(p.particleCount ?? current.particleCount),
          palette: p.palette && PALETTES[p.palette] ? p.palette : current.palette,
        };
      },
    },
  ),
);

/** Telemetry updated a few times per second; kept apart so it never triggers persistence writes. */
export const useTelemetryStore = create<{ fps: number; setFps: (fps: number) => void }>()((set) => ({
  fps: 60,
  setFps: (fps) => set({ fps }),
}));

/** Snapshot of the current scene configuration (used for artifacts). */
export function currentConfig(cameraDistance: number): SceneConfig {
  const s = useVantaStore.getState();
  return {
    mode: s.mode,
    palette: s.palette,
    modeParams: cloneModeParams(s.modeParams),
    particleCount: s.particleCount,
    post: { ...s.post },
    worldSeed: s.worldSeed,
    cameraDistance,
  };
}
