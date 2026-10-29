import { noiseGLSL } from "./noise.glsl";
import { fieldGLSL } from "./field.glsl";

export const artifactVertexShader = /* glsl */ `
${noiseGLSL}
${fieldGLSL}

uniform float uBodyRadius;

varying vec3 vNormalW;
varying vec3 vWorld;
varying vec3 vObj;
varying float vEnergy;
varying float vTidal;

float bodyNoise(vec3 n) {
  vec3 q = n * 1.05 + vec3(uSeed, uSeed * 0.37, -uSeed * 0.21);
  float a = snoise(q + vec3(0.0, uTime * 0.11, uTime * 0.06));
  float b = snoise(q * 2.1 - vec3(uTime * 0.19, 0.0, uTime * 0.15));
  return a * 0.085 + b * 0.022;
}

/* World-space position of the displaced surface for unit direction n. */
vec3 surface(vec3 n, out float energy, out float tidalOut) {
  float t = uTime;
  vec3 center = modelMatrix[3].xyz;
  float pulse = 0.022 * sin(t * 1.4) + 0.01 * sin(t * 3.1 + n.y * 4.0);
  float r = uBodyRadius * (1.0 + bodyNoise(n) + pulse);
  vec3 w = (modelMatrix * vec4(n * r, 1.0)).xyz;
  vec3 nw = normalize(mat3(modelMatrix) * n);
  energy = 0.0;

  float R = max(uRadius, 0.2);
  float deform = uStrength * uDeform;

  // Hover: the surface reaches toward the observer's cursor.
  vec3 toP = uPointer - w;
  float d = length(toP);
  vec3 dirP = toP / max(d, 1e-4);
  float facing = max(dot(nw, dirP), 0.0);
  float near = exp(-d * d / (R * R * 0.7));
  float reach = near * uPointerActive * 0.2 * deform * (0.35 + 0.65 * facing);
  w += nw * reach;
  energy += reach * 2.5;

  // GRAVITY: tidal stretching toward the (lagging) gravity point, compression on the far side.
  vec3 toG = uGravityPoint - w;
  float gd = length(toG);
  vec3 gdir = toG / max(gd, 1e-4);
  float gAmt = (uModeWeights.x * (0.28 * uPointerActive + 0.95 * uHold) + 0.45 * uHold * (1.0 - uModeWeights.x)) * deform;
  float tidal = pow(max(dot(nw, gdir), 0.0), 3.0);
  float stretch = gAmt * tidal * exp(-gd * 0.22) * 0.95;
  w += gdir * stretch;
  w -= nw * gAmt * pow(max(-dot(nw, gdir), 0.0), 2.0) * 0.1;
  energy += stretch * 1.6;
  tidalOut = stretch;

  // History: travelling ripples, lingering wells and shock fronts, mostly along the normal (liquid response).
  float he;
  vec3 gains = vec3(0.07, 0.16, 0.42 * (0.55 + 0.95 * uModeWeights.y));
  vec3 hf = historyField(w, gains, he) * uDeform;
  w += nw * dot(hf, nw) * 0.85 + hf * 0.15;
  energy += he * 0.7;

  // LENS: space twists around the axis pointing at the cursor, with standing interference rings.
  float lw = uModeWeights.z * deform;
  float lf = exp(-d * d / (R * R)) * uPointerActive;
  vec3 axis = normalize(uPointer - center + vec3(0.0, 0.0, 1e-3));
  float twist = lw * lf * (0.8 + uHold * 1.3);
  w = center + rotateAround(w - center, axis, twist);
  w += nw * sin(d * 14.0 - t * 6.0) * 0.028 * lw * lf;
  energy += twist * 0.9;

  // Shockwave charge: the body vibrates while a pulse is being charged.
  w += nw * snoise(n * 6.0 + t * 9.0) * 0.045 * uCharge;
  energy += uCharge * 0.7;

  return w;
}

void main() {
  vec3 n = normalize(position);
  vec3 ref = abs(n.y) < 0.99 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0);
  vec3 tA = normalize(cross(n, ref));
  vec3 tB = cross(n, tA);

  const float eps = 0.012;
  float e0, e1, e2, t0, t1, t2;
  vec3 p0 = surface(n, e0, t0);
  vec3 p1 = surface(normalize(n + tA * eps), e1, t1);
  vec3 p2 = surface(normalize(n + tB * eps), e2, t2);

  vec3 N = normalize(cross(p1 - p0, p2 - p0));
  if (dot(N, p0 - modelMatrix[3].xyz) < 0.0) N = -N;

  vNormalW = N;
  vWorld = p0;
  vObj = n;
  vEnergy = e0;
  vTidal = t0;
  gl_Position = projectionMatrix * viewMatrix * vec4(p0, 1.0);
}
`;
