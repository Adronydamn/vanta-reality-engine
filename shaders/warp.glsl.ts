import { SCREEN_RINGS } from "@/lib/engine";

/**
 * Screen-space space-time warp (postprocessing Effect, mainUv stage):
 *  - permanent lensing of the background around the artifact,
 *  - Plummer-softened gravitational lens at the cursor (LENS mode),
 *  - refractive ripples travelling with every shock front.
 */
export const warpFragmentShader = /* glsl */ `
#define WARP_RINGS ${SCREEN_RINGS}

uniform vec2 uWarpPointer;
uniform float uWarpLens;
uniform vec3 uWarpArtifact;
uniform float uWarpTime;
uniform float uWarpRingGain;
uniform vec4 uWarpRings[WARP_RINGS];

void mainUv(inout vec2 uv) {
  vec2 asp = vec2(aspect, 1.0);
  vec2 offset = vec2(0.0);

  // Artifact: compress the background around the event horizon.
  vec2 d = (uv - uWarpArtifact.xy) * asp;
  float r = max(length(d), 1e-4);
  float rs = uWarpArtifact.z;
  float thetaE = rs * 0.62;
  offset -= (d / r) * (thetaE * thetaE / r) * smoothstep(rs * 1.02, rs * 1.75, r);

  // Cursor lens: source = image - thetaE^2 * image / (|image|^2 + core^2); inverts the core.
  if (uWarpLens > 1e-4) {
    vec2 dp = (uv - uWarpPointer) * asp;
    float rp2 = dot(dp, dp);
    float core = uWarpLens * 0.28;
    float fade = smoothstep(uWarpLens * 9.0, uWarpLens * 3.0, sqrt(rp2));
    offset -= dp * (uWarpLens * uWarpLens) / (rp2 + core * core) * fade;
  }

  // Shock fronts: derivative-of-gaussian refraction ring.
  for (int i = 0; i < WARP_RINGS; i++) {
    vec4 ring = uWarpRings[i];
    float age = uWarpTime - ring.z;
    if (age < 0.0 || age > 3.0) continue;
    vec2 dr = (uv - ring.xy) * asp;
    float rr = max(length(dr), 1e-4);
    float front = age * 0.62;
    float w = 0.035 + age * 0.03;
    float q = (rr - front) / w;
    float amp = -q * exp(-q * q) * ring.w * exp(-age * 1.4) * 0.032 * uWarpRingGain;
    offset += (dr / rr) * amp;
  }

  uv += offset / asp;
}
`;
