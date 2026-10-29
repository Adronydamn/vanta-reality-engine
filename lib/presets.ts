import type { FieldMode, ModeParams, PostSettings } from "@/types/vanta";

export const MODE_LABELS: Record<FieldMode, string> = {
  gravity: "GRAVITY",
  shockwave: "WAVES",
  lens: "LENS",
};

export const MODE_DESCRIPTIONS: Record<FieldMode, string> = {
  gravity: "ATTRACTOR // TIDAL STRETCH",
  shockwave: "IMPULSE // PROPAGATING FRONT",
  lens: "CURVATURE // EINSTEIN RING",
};

export const DEFAULT_MODE_PARAMS: Record<FieldMode, ModeParams> = {
  gravity: { strength: 1.0, radius: 1.6, decay: 1.0, deform: 1.0 },
  shockwave: { strength: 1.1, radius: 1.8, decay: 1.0, deform: 1.0 },
  lens: { strength: 1.0, radius: 1.4, decay: 1.0, deform: 1.0 },
};

export const DEFAULT_POST: PostSettings = {
  enabled: true,
  bloom: true,
  bloomIntensity: 1.0,
  grain: true,
  warp: true,
};

export const PARTICLES_MIN = 2000;
export const PARTICLES_MAX_DESKTOP = 24000;
export const PARTICLES_MAX_MOBILE = 12000;

export const CAMERA_DISTANCE_DEFAULT = 7.2;
export const CAMERA_DISTANCE_MIN = 3.6;
export const CAMERA_DISTANCE_MAX = 13;

export function cloneModeParams(src: Record<FieldMode, ModeParams>): Record<FieldMode, ModeParams> {
  return {
    gravity: { ...src.gravity },
    shockwave: { ...src.shockwave },
    lens: { ...src.lens },
  };
}

export function randomSeed(): string {
  const bytes = new Uint8Array(2);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Deterministic 0..1 hash of a seed string (FNV-1a) */
export function seedToUnit(seed: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0) / 0xffffffff;
}
