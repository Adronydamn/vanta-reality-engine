import { noiseGLSL } from "./noise.glsl";
import { fieldGLSL } from "./field.glsl";

/**
 * position: x = orbital radius, y = initial phase, z = disk height (disk) or cos(polar) (halo)
 * aData:    x = orbital speed factor, y = size, z = layer (0 disk, 1 halo), w = random seed
 */
export const particlesVertexShader = /* glsl */ `
${noiseGLSL}
${fieldGLSL}

attribute vec4 aData;

uniform float uPixelRatio;
uniform float uSize;
uniform float uDiskTilt;
uniform vec3 uColPA;
uniform vec3 uColPB;
uniform vec3 uColHot;

varying vec3 vColor;
varying float vAlpha;

void main() {
  float radius = position.x;
  float layer = aData.z;
  float seed = aData.w;

  // Keplerian orbit: inner matter moves faster.
  float omega = aData.x * 0.95 / pow(radius, 1.5);
  float ang = position.y + uTime * omega;
  vec3 p;
  if (layer < 0.5) {
    p = vec3(cos(ang) * radius, position.z, sin(ang) * radius);
    float c = cos(uDiskTilt);
    float s = sin(uDiskTilt);
    p = vec3(p.x, p.y * c - p.z * s, p.y * s + p.z * c);
  } else {
    float ct = position.z;
    float st = sqrt(max(0.0, 1.0 - ct * ct));
    p = vec3(cos(ang) * st, ct, sin(ang) * st) * radius;
  }

  // Slow turbulent breathing of the medium.
  vec3 nq = p * 0.45 + vec3(seed * 13.0, uTime * 0.08, uSeed);
  p += vec3(snoise(nq), snoise(nq + 31.7), snoise(nq - 17.3)) * (0.04 + 0.05 * layer) * radius * 0.35;

  vec3 w = (modelMatrix * vec4(p, 1.0)).xyz;
  vec3 forward = normalize(-cameraPosition);
  float R = max(uRadius, 0.2);
  float energy = 0.0;

  // Hover: matter is deflected around the cursor and dragged along its wake.
  vec3 dv = w - uPointer;
  float d = length(dv);
  vec3 dir = dv / max(d, 1e-4);
  float fall = exp(-d * d / (R * R)) * uPointerActive;
  float repel = mix(0.55, -0.3, uModeWeights.x) * uStrength;
  w += dir * fall * repel;
  vec3 wake = uPointerVelocity * 0.035;
  float wl = length(wake);
  w += (wl > 0.6 ? wake * (0.6 / wl) : wake) * fall;
  energy += fall * 0.5;

  // Gravity anomaly: matter collapses into a swirling accretion vortex around the well.
  vec3 g = w - uGravityPoint;
  float gpar = dot(g, forward);
  vec3 gperp = g - gpar * forward;
  float gd = length(gperp);
  float gGain = uHold * uStrength * (0.55 + 0.65 * uModeWeights.x);
  float pull = clamp(gGain * exp(-length(g) / (R * 1.5)), 0.0, 0.93);
  float ringR = 0.16 + gd * 0.12 + fract(seed * 7.31) * 0.12;
  float newD = mix(gd, ringR, pull);
  vec3 gdir = gperp / max(gd, 1e-4);
  gdir = rotateAround(gdir, forward, uSwirl * 2.4 * pull / (newD + 0.22));
  w = uGravityPoint + gdir * newD + forward * gpar * (1.0 - pull * 0.85);
  energy += pull * 1.4;

  // Traces and shock fronts.
  float he;
  vec3 gains = vec3(0.12, 0.3, 0.9 * (0.6 + 0.9 * uModeWeights.y));
  w += historyField(w, gains, he);
  energy += he;

  // Distortion: Einstein-ring lensing around the cursor, stronger for matter behind the focal plane.
  float behind = smoothstep(-1.5, 1.5, dot(w - uPointer, forward));
  float thetaE = R * 0.38 * (1.0 + uHold * 0.9) * uStrength * uPointerActive * uModeWeights.z;
  vec3 lensed = lensImage(w, uPointer, forward, thetaE);
  w = mix(w, lensed, 0.35 + 0.65 * behind);
  energy += thetaE * 0.8 * exp(-d * d / (R * R * 2.0));

  // The artifact itself bends light from matter behind it.
  float behindCore = smoothstep(-0.4, 1.2, dot(w, forward));
  w = mix(w, lensImage(w, vec3(0.0), forward, 0.5), behindCore);

  vec4 mv = viewMatrix * vec4(w, 1.0);
  gl_Position = projectionMatrix * mv;

  float size = aData.y * uSize * (1.0 + min(energy, 2.0) * 0.7);
  gl_PointSize = clamp(size * uPixelRatio * 160.0 / -mv.z, 0.0, 28.0 * uPixelRatio);

  vec3 base = mix(uColPA, uColPB, fract(seed * 3.17));
  vColor = mix(base, uColHot, clamp(energy * 0.45, 0.0, 0.85)) * (1.0 + min(energy, 2.0) * 0.9);
  float nearFade = smoothstep(0.8, 2.4, -mv.z);
  float flicker = 0.75 + 0.25 * sin(uTime * (1.0 + seed * 3.0) + seed * 40.0);
  vAlpha = (layer < 0.5 ? 0.75 : 0.38) * nearFade * flicker;
}
`;
