export type FieldMode = "gravity" | "shockwave" | "lens";

export type PaletteId = "vanta" | "plasma" | "aurora" | "solar";

export interface ModeParams {
  /** Overall field strength, 0.00 – 2.00 */
  strength: number;
  /** Influence radius in world units */
  radius: number;
  /** How quickly traces and waves fade (1 = default) */
  decay: number;
  /** Surface deformation intensity of the artifact */
  deform: number;
}

export interface PostSettings {
  enabled: boolean;
  bloom: boolean;
  bloomIntensity: number;
  grain: boolean;
  warp: boolean;
}

export interface PerformanceSettings {
  adaptive: boolean;
  maxDpr: number;
}

export interface SceneConfig {
  mode: FieldMode;
  palette: PaletteId;
  modeParams: Record<FieldMode, ModeParams>;
  particleCount: number;
  post: PostSettings;
  worldSeed: string;
  cameraDistance: number;
}

export interface ArtifactRecord {
  id: string;
  seed: string;
  number: number;
  createdAt: number;
  config: SceneConfig;
}

export interface Palette {
  id: PaletteId;
  label: string;
  /** Deep background colour */
  background: string;
  /** Haze / nebula tint */
  haze: string;
  /** Dark body of the artifact */
  deep: string;
  /** Mid-tone reflections */
  mid: string;
  /** Rim / fresnel glow */
  rim: string;
  /** Hot highlights and energy veins */
  hot: string;
  /** Particle tint A */
  particleA: string;
  /** Particle tint B */
  particleB: string;
  bloom: number;
}

/** Pointer history impulse types (mirrored in GLSL) */
export const IMPULSE_MOVE = 0;
export const IMPULSE_GRAVITY = 1;
export const IMPULSE_SHOCK = 2;
export type ImpulseType = typeof IMPULSE_MOVE | typeof IMPULSE_GRAVITY | typeof IMPULSE_SHOCK;
