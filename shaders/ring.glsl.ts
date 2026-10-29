import { noiseGLSL } from "./noise.glsl";
import { fieldGLSL } from "./field.glsl";

/** Accretion ring: a thin luminous disk threaded through the artifact. */
export const ringVertexShader = /* glsl */ `
${noiseGLSL}
${fieldGLSL}

varying float vR;
varying float vAngle;
varying float vEnergy;

void main() {
  vR = length(position.xy);
  vAngle = atan(position.y, position.x);

  vec3 w = (modelMatrix * vec4(position, 1.0)).xyz;
  float R = max(uRadius, 0.2);

  // The ring is pulled into the gravity well and rippled by traces and shock fronts.
  vec3 toG = uGravityPoint - w;
  float gd = length(toG);
  float pull = clamp(uHold * uStrength * 0.35 * exp(-gd / (R * 1.4)), 0.0, 0.6);
  w += toG * pull;

  float he;
  w += historyField(w, vec3(0.08, 0.2, 0.55 * (0.6 + 0.8 * uModeWeights.y)), he) * uDeform;

  vec3 dv = w - uPointer;
  float d = length(dv);
  w += normalize(dv + 1e-4) * exp(-d * d / (R * R)) * uPointerActive * 0.25 * uStrength * (1.0 - uModeWeights.x);

  vEnergy = he + pull * 2.0;
  gl_Position = projectionMatrix * viewMatrix * vec4(w, 1.0);
}
`;

export const ringFragmentShader = /* glsl */ `
${noiseGLSL}

uniform float uTime;
uniform float uInner;
uniform float uOuter;
uniform vec3 uColRim;
uniform vec3 uColHot;
uniform vec3 uColMid;

varying float vR;
varying float vAngle;
varying float vEnergy;

void main() {
  float rn = clamp((vR - uInner) / (uOuter - uInner), 0.0, 1.0);
  float spiral = vAngle + uTime * 0.45 / pow(vR, 1.5) * 2.0 - log(vR) * 2.2;
  vec3 nq = vec3(cos(spiral) * 1.8, sin(spiral) * 1.8, vR * 2.4 - uTime * 0.15);
  float n = snoise(nq) * 0.5 + 0.5;
  float fine = snoise(nq * 3.1 + 7.0) * 0.5 + 0.5;
  float bands = 0.7 + 0.3 * sin(vR * 19.0 + n * 5.0 + fine * 2.0);
  float streaks = pow(fine, 2.5);

  float profile = smoothstep(0.0, 0.06, rn) * pow(1.0 - rn, 2.4);
  float innerGlow = exp(-rn * 7.0);
  float doppler = 0.45 + 0.55 * (0.5 + 0.5 * cos(vAngle));
  float excite = clamp(vEnergy, 0.0, 2.0);

  vec3 col = mix(uColMid * 1.4, uColRim, smoothstep(0.9, 0.2, rn));
  col = mix(col, uColHot, innerGlow * 0.8);
  float lum = profile * bands * (0.25 + 0.75 * n * n) * (0.55 + 0.9 * streaks) * doppler * (1.0 + excite * 1.5);
  // Additive blending: colour is pre-weighted, alpha stays at 1.
  gl_FragColor = vec4(col * lum * 0.85, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;
