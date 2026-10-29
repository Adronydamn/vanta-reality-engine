import * as THREE from "three";
import { PointerHistory } from "./pointer-history";
import { createSharedUniforms, PALETTE_UNIFORM_MAP, type PaletteUniformKey, type SharedUniforms } from "./uniforms";
import { CAMERA_DISTANCE_DEFAULT, CAMERA_DISTANCE_MAX, CAMERA_DISTANCE_MIN } from "./presets";
import { IMPULSE_GRAVITY, IMPULSE_MOVE, IMPULSE_SHOCK, type FieldMode, type ModeParams, type Palette } from "@/types/vanta";

/** Number of screen-space shock rings forwarded to the space-warp post effect. Must match GLSL. */
export const SCREEN_RINGS = 6;

export interface FrameSettings {
  mode: FieldMode;
  params: ModeParams;
  paused: boolean;
}

export interface InputState {
  /** Pointer in normalized device coordinates */
  ndc: THREE.Vector2;
  inside: boolean;
  down: boolean;
  /** Set when the pointer teleports (touch start, re-enter) so no fake velocity spike is produced */
  jumped: boolean;
  pendingDown: boolean;
  pendingUp: boolean;
}

const MODE_WEIGHTS: Record<FieldMode, THREE.Vector3> = {
  gravity: new THREE.Vector3(1, 0, 0),
  shockwave: new THREE.Vector3(0, 1, 0),
  lens: new THREE.Vector3(0, 0, 1),
};

const clamp = THREE.MathUtils.clamp;

/**
 * Mutable, frame-rate driven runtime of the Reality Engine.
 * Lives outside React so high-frequency data never triggers renders.
 */
export class VantaEngine {
  readonly history = new PointerHistory();
  readonly uniforms: SharedUniforms;
  readonly input: InputState = {
    ndc: new THREE.Vector2(0, 0),
    inside: false,
    down: false,
    jumped: true,
    pendingDown: false,
    pendingUp: false,
  };

  simTime = 0;
  /** Raw pointer projected on the focal plane (world space) */
  readonly pointer = new THREE.Vector3();
  readonly velocity = new THREE.Vector3();
  speed = 0;
  hold = 0;
  charge = 0;
  swirl = 0;
  active = 0;

  zoomTarget = CAMERA_DISTANCE_DEFAULT;
  /** 0..1, eased camera drift used while capturing an artifact */
  captureDrift = 0;
  captureActive = false;
  captureRequested = false;
  onCaptured: ((dataUrl: string) => void) | null = null;

  /** Screen-space data for the post-processing warp */
  readonly pointerScreen = new THREE.Vector2(0.5, 0.5);
  /** xy: artifact centre (uv), z: projected radius (uv height units) */
  readonly artifactScreen = new THREE.Vector3(0.5, 0.5, 0.15);
  /** xy: uv, z: birth time, w: strength */
  readonly rings: THREE.Vector4[] = Array.from({ length: SCREEN_RINGS }, () => new THREE.Vector4(0.5, 0.5, -1e4, 0));
  bloomLevel = 1;

  private ringHead = 0;
  private bloomTarget = 1;
  private readonly targetColors = new Map<PaletteUniformKey, THREE.Color>();
  private readonly prevPointer = new THREE.Vector3();
  private readonly lastPush = new THREE.Vector3(1e3, 1e3, 1e3);
  private lastMoveT = -10;
  private lastGravityT = -10;
  private lastShockT = -10;
  private readonly raycaster = new THREE.Raycaster();
  private readonly plane = new THREE.Plane();
  private readonly camDir = new THREE.Vector3();
  private readonly tmp = new THREE.Vector3();
  private readonly tmp2 = new THREE.Vector3();
  private readonly inst = new THREE.Vector3();

  constructor() {
    this.uniforms = createSharedUniforms(this.history.texture);
    for (const [, key] of PALETTE_UNIFORM_MAP) this.targetColors.set(key, new THREE.Color());
  }

  setPalette(palette: Palette, immediate = false) {
    for (const [paletteKey, uniformKey] of PALETTE_UNIFORM_MAP) {
      const target = this.targetColors.get(uniformKey)!;
      target.set(palette[paletteKey]);
      if (immediate) this.uniforms[uniformKey].value.copy(target);
    }
    this.bloomTarget = palette.bloom;
    if (immediate) this.bloomLevel = palette.bloom;
  }

  setSeed(unit: number) {
    this.uniforms.uSeed.value = unit * 100;
  }

  zoomBy(factor: number) {
    this.zoomTarget = clamp(this.zoomTarget * factor, CAMERA_DISTANCE_MIN, CAMERA_DISTANCE_MAX);
  }

  setZoom(distance: number) {
    this.zoomTarget = clamp(distance, CAMERA_DISTANCE_MIN, CAMERA_DISTANCE_MAX);
  }

  /** Return the world to its initial state (keeps user settings). */
  reset() {
    this.history.clear();
    this.simTime = 0;
    this.hold = 0;
    this.charge = 0;
    this.swirl = 0;
    this.active = 0;
    this.speed = 0;
    this.velocity.set(0, 0, 0);
    this.zoomTarget = CAMERA_DISTANCE_DEFAULT;
    this.lastPush.set(1e3, 1e3, 1e3);
    this.lastMoveT = this.lastGravityT = this.lastShockT = -10;
    this.input.jumped = true;
    for (const r of this.rings) r.set(0.5, 0.5, -1e4, 0);
    const u = this.uniforms;
    u.uTime.value = 0;
    u.uHold.value = 0;
    u.uCharge.value = 0;
    u.uSwirl.value = 0;
    u.uPointerActive.value = 0;
  }

  private emitShock(strength: number, radiusScale: number) {
    this.history.push(this.pointer, this.simTime, strength, this.speed, IMPULSE_SHOCK, radiusScale);
    this.rings[this.ringHead].set(this.pointerScreen.x, this.pointerScreen.y, this.simTime, strength);
    this.ringHead = (this.ringHead + 1) % SCREEN_RINGS;
    this.lastShockT = this.simTime;
  }

  private projectScreen(camera: THREE.Camera) {
    this.tmp.set(0, 0, 0).project(camera);
    const cx = this.tmp.x;
    const cy = this.tmp.y;
    this.tmp2.setFromMatrixColumn(camera.matrixWorld, 1).multiplyScalar(1.25);
    this.tmp2.project(camera);
    this.artifactScreen.set(cx * 0.5 + 0.5, cy * 0.5 + 0.5, Math.abs(this.tmp2.y - cy) * 0.5);
  }

  update(dt: number, camera: THREE.Camera, s: FrameSettings) {
    const u = this.uniforms;
    const ease = (rate: number) => 1 - Math.exp(-dt * rate);

    // Palette and bloom transitions run even while time is frozen.
    for (const [key, target] of this.targetColors) u[key].value.lerp(target, ease(2.2));
    this.bloomLevel += (this.bloomTarget - this.bloomLevel) * ease(2.2);

    // Project the pointer onto the camera-facing focal plane through the artifact.
    this.raycaster.setFromCamera(this.input.ndc, camera);
    camera.getWorldDirection(this.camDir);
    this.plane.setFromNormalAndCoplanarPoint(this.camDir, this.tmp.set(0, 0, 0));
    if (this.raycaster.ray.intersectPlane(this.plane, this.tmp)) this.pointer.copy(this.tmp);
    this.pointerScreen.set(this.input.ndc.x * 0.5 + 0.5, this.input.ndc.y * 0.5 + 0.5);
    this.projectScreen(camera);

    if (s.paused || dt <= 0) return;

    this.simTime += dt;
    const t = this.simTime;
    const p = s.params;

    u.uModeWeights.value.lerp(MODE_WEIGHTS[s.mode], ease(3));
    u.uStrength.value += (p.strength - u.uStrength.value) * ease(4);
    u.uRadius.value += (p.radius - u.uRadius.value) * ease(4);
    u.uDecay.value += (p.decay - u.uDecay.value) * ease(4);
    u.uDeform.value += (p.deform - u.uDeform.value) * ease(4);

    // Pointer kinematics
    if (this.input.jumped) {
      this.prevPointer.copy(this.pointer);
      this.lastPush.copy(this.pointer);
      this.input.jumped = false;
    }
    this.inst.subVectors(this.pointer, this.prevPointer).divideScalar(Math.max(dt, 1e-3));
    this.velocity.lerp(this.inst, ease(12));
    this.speed = this.velocity.length();
    this.prevPointer.copy(this.pointer);

    const { inside, down } = this.input;
    this.active += ((inside ? 1 : 0) - this.active) * ease(inside ? 4 : 1.5);
    this.hold += ((down ? 1 : 0) - this.hold) * ease(down ? 2.4 : 1.3);
    if (down) this.swirl += dt * this.hold * 1.8;
    else this.swirl *= Math.exp(-dt * 1.1);

    if (down && s.mode === "shockwave") this.charge = Math.min(1, this.charge + dt * 0.8);
    else if (!down) this.charge *= Math.exp(-dt * 6);

    if (this.input.pendingDown) {
      this.input.pendingDown = false;
      if (s.mode === "shockwave") this.emitShock(0.9, 1);
    }
    if (this.input.pendingUp) {
      this.input.pendingUp = false;
      if (s.mode === "shockwave" && this.charge > 0.15) this.emitShock(1 + this.charge * 1.4, 1 + this.charge * 0.8);
      this.charge = 0;
    }

    if (inside) {
      if (this.pointer.distanceTo(this.lastPush) > 0.14 && t - this.lastMoveT > 0.016) {
        this.history.push(this.pointer, t, clamp(this.speed / 5, 0.2, 1.2), this.speed, IMPULSE_MOVE);
        this.lastPush.copy(this.pointer);
        this.lastMoveT = t;
      }
      if (down && t - this.lastGravityT > 0.14) {
        this.history.push(this.pointer, t, this.hold, this.speed, IMPULSE_GRAVITY);
        this.lastGravityT = t;
      }
      const threshold = s.mode === "shockwave" ? 6.5 : 13;
      const cooldown = s.mode === "shockwave" ? 0.22 : 0.45;
      if (this.speed > threshold && t - this.lastShockT > cooldown) {
        this.emitShock(clamp((this.speed / threshold) * 0.6, 0.45, 1.4), 1);
      }
    }

    u.uTime.value = t;
    u.uPointer.value.lerp(this.pointer, ease(14));
    u.uGravityPoint.value.lerp(this.pointer, ease(3.2));
    u.uPointerVelocity.value.copy(this.velocity);
    u.uPointerActive.value = this.active;
    u.uHold.value = this.hold;
    u.uCharge.value = this.charge;
    u.uSwirl.value = this.swirl;
  }
}

let instance: VantaEngine | null = null;

export function getEngine(): VantaEngine {
  if (!instance) instance = new VantaEngine();
  return instance;
}
