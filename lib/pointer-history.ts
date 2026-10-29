import * as THREE from "three";
import type { ImpulseType } from "@/types/vanta";

/** Number of samples kept in the ring buffer. Must match HISTORY_SIZE in GLSL. */
export const HISTORY_SIZE = 64;

/** Time stamp used for empty slots: far enough in the past that every wave has decayed. */
const EMPTY_TIME = -1e4;

/**
 * Ring buffer of pointer impulses, mirrored into a 2-row float DataTexture.
 *
 * Row 0 (RGBA): world position xyz, birth time (simulation seconds)
 * Row 1 (RGBA): strength, speed, impulse type, radius multiplier
 */
export class PointerHistory {
  readonly size = HISTORY_SIZE;
  readonly data: Float32Array;
  readonly texture: THREE.DataTexture;
  private head = 0;

  constructor() {
    this.data = new Float32Array(HISTORY_SIZE * 2 * 4);
    this.texture = new THREE.DataTexture(this.data, HISTORY_SIZE, 2, THREE.RGBAFormat, THREE.FloatType);
    this.texture.minFilter = THREE.NearestFilter;
    this.texture.magFilter = THREE.NearestFilter;
    this.texture.generateMipmaps = false;
    this.clear();
  }

  clear() {
    this.data.fill(0);
    for (let i = 0; i < HISTORY_SIZE; i++) this.data[i * 4 + 3] = EMPTY_TIME;
    this.head = 0;
    this.texture.needsUpdate = true;
  }

  push(pos: THREE.Vector3, time: number, strength: number, speed: number, type: ImpulseType, radiusScale = 1) {
    const i = this.head;
    const r0 = i * 4;
    const r1 = (HISTORY_SIZE + i) * 4;
    this.data[r0] = pos.x;
    this.data[r0 + 1] = pos.y;
    this.data[r0 + 2] = pos.z;
    this.data[r0 + 3] = time;
    this.data[r1] = strength;
    this.data[r1 + 1] = speed;
    this.data[r1 + 2] = type;
    this.data[r1 + 3] = radiusScale;
    this.head = (i + 1) % HISTORY_SIZE;
    this.texture.needsUpdate = true;
  }

  dispose() {
    this.texture.dispose();
  }
}
