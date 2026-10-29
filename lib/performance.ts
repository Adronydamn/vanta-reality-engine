import { PARTICLES_MAX_DESKTOP, PARTICLES_MAX_MOBILE } from "./presets";

export interface DeviceProfile {
  mobile: boolean;
  lowEnd: boolean;
  maxParticles: number;
  defaultParticles: number;
  maxDpr: number;
}

export function detectDevice(): DeviceProfile {
  if (typeof window === "undefined") {
    return { mobile: false, lowEnd: false, maxParticles: PARTICLES_MAX_DESKTOP, defaultParticles: PARTICLES_MAX_DESKTOP, maxDpr: 1.75 };
  }
  const coarse = window.matchMedia("(pointer: coarse)").matches;
  const small = Math.min(window.innerWidth, window.innerHeight) < 700;
  const mobile = coarse && small;
  const cores = navigator.hardwareConcurrency ?? 4;
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8;
  const lowEnd = cores <= 4 || memory <= 4;

  const maxParticles = mobile ? PARTICLES_MAX_MOBILE : PARTICLES_MAX_DESKTOP;
  const defaultParticles = mobile ? (lowEnd ? 6000 : 9000) : lowEnd ? 14000 : PARTICLES_MAX_DESKTOP;
  const maxDpr = mobile ? 1.5 : lowEnd ? 1.5 : 1.75;
  return { mobile, lowEnd, maxParticles, defaultParticles, maxDpr };
}

export type WebGLSupport = "webgl2" | "webgl1" | "none";

export function detectWebGL(): WebGLSupport {
  try {
    const canvas = document.createElement("canvas");
    if (canvas.getContext("webgl2")) return "webgl2";
    if (canvas.getContext("webgl") || canvas.getContext("experimental-webgl")) return "webgl1";
  } catch {
    /* context creation can throw on locked-down browsers */
  }
  return "none";
}

/** Lightweight rolling FPS meter that never triggers React renders. */
export class FpsMeter {
  private frames = 0;
  private elapsed = 0;
  fps = 60;

  /** Returns true when a new sample is available. */
  tick(dt: number, window = 0.5): boolean {
    this.frames++;
    this.elapsed += dt;
    if (this.elapsed >= window) {
      this.fps = this.frames / this.elapsed;
      this.frames = 0;
      this.elapsed = 0;
      return true;
    }
    return false;
  }
}
