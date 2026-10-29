import * as THREE from "three";
import { Effect } from "postprocessing";
import { warpFragmentShader } from "@/shaders/warp.glsl";
import type { VantaEngine } from "@/lib/engine";

export class SpaceWarpEffect extends Effect {
  private readonly lensUniform: THREE.Uniform<number>;
  private readonly timeUniform: THREE.Uniform<number>;
  private lens = 0;

  constructor(private readonly engine: VantaEngine) {
    const lens = new THREE.Uniform(0);
    const time = new THREE.Uniform(0);
    super("SpaceWarpEffect", warpFragmentShader, {
      uniforms: new Map<string, THREE.Uniform>([
        ["uWarpPointer", new THREE.Uniform(engine.pointerScreen)],
        ["uWarpLens", lens],
        ["uWarpArtifact", new THREE.Uniform(engine.artifactScreen)],
        ["uWarpTime", time],
        ["uWarpRingGain", new THREE.Uniform(1)],
        ["uWarpRings", new THREE.Uniform(engine.rings)],
      ]),
    });
    this.lensUniform = lens;
    this.timeUniform = time;
  }

  /** Called by postprocessing before every frame. */
  override update(_renderer: THREE.WebGLRenderer, _inputBuffer: THREE.WebGLRenderTarget, deltaTime?: number) {
    const u = this.engine.uniforms;
    const target = 0.065 * u.uStrength.value * (1 + u.uHold.value * 0.9) * u.uPointerActive.value * u.uModeWeights.value.z;
    if (deltaTime && deltaTime > 0) this.lens += (target - this.lens) * (1 - Math.exp(-deltaTime * 6));
    this.lensUniform.value = this.lens;
    this.timeUniform.value = this.engine.simTime;
  }
}
