import * as THREE from "three";

/**
 * Uniform objects shared by every shader in the scene. Materials reference the very same
 * `{ value }` objects, so one mutation per frame updates all of them at once.
 */
export function createSharedUniforms(historyTexture: THREE.Texture) {
  return {
    uTime: { value: 0 },
    uHistory: { value: historyTexture },
    uPointer: { value: new THREE.Vector3() },
    uPointerActive: { value: 0 },
    uPointerVelocity: { value: new THREE.Vector3() },
    uHold: { value: 0 },
    uCharge: { value: 0 },
    uGravityPoint: { value: new THREE.Vector3() },
    uSwirl: { value: 0 },
    /** x: gravity, y: shockwave, z: lens — eased so mode switches blend smoothly */
    uModeWeights: { value: new THREE.Vector3(1, 0, 0) },
    uStrength: { value: 1 },
    uRadius: { value: 1.6 },
    uDecay: { value: 1 },
    uDeform: { value: 1 },
    uSeed: { value: 0 },
    uColBg: { value: new THREE.Color() },
    uColHaze: { value: new THREE.Color() },
    uColDeep: { value: new THREE.Color() },
    uColMid: { value: new THREE.Color() },
    uColRim: { value: new THREE.Color() },
    uColHot: { value: new THREE.Color() },
    uColPA: { value: new THREE.Color() },
    uColPB: { value: new THREE.Color() },
  };
}

export type SharedUniforms = ReturnType<typeof createSharedUniforms>;

export type PaletteColorKey = "background" | "haze" | "deep" | "mid" | "rim" | "hot" | "particleA" | "particleB";
export type PaletteUniformKey = "uColBg" | "uColHaze" | "uColDeep" | "uColMid" | "uColRim" | "uColHot" | "uColPA" | "uColPB";

export const PALETTE_UNIFORM_MAP: ReadonlyArray<[PaletteColorKey, PaletteUniformKey]> = [
  ["background", "uColBg"],
  ["haze", "uColHaze"],
  ["deep", "uColDeep"],
  ["mid", "uColMid"],
  ["rim", "uColRim"],
  ["hot", "uColHot"],
  ["particleA", "uColPA"],
  ["particleB", "uColPB"],
];
