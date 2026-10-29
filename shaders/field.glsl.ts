import { HISTORY_SIZE } from "@/lib/pointer-history";

/**
 * Shared force-field model. Every displaced surface (artifact, accretion ring, particles)
 * evaluates the same functions so the whole scene responds as one coherent medium.
 */
export const fieldGLSL = /* glsl */ `
#define HISTORY_SIZE ${HISTORY_SIZE}

uniform sampler2D uHistory;
uniform float uTime;
uniform vec3 uPointer;
uniform float uPointerActive;
uniform vec3 uPointerVelocity;
uniform float uHold;
uniform float uCharge;
uniform vec3 uGravityPoint;
uniform float uSwirl;
uniform vec3 uModeWeights;
uniform float uStrength;
uniform float uRadius;
uniform float uDecay;
uniform float uDeform;
uniform float uSeed;

vec3 rotateAround(vec3 v, vec3 k, float a) {
  float c = cos(a);
  float s = sin(a);
  return v * c + cross(k, v) * s + k * dot(k, v) * (1.0 - c);
}

/*
 * Integrates the pointer history ring buffer at point x.
 * gains.x: travelling ripples from move traces
 * gains.y: residual pull of gravity traces
 * gains.z: expanding shock fronts
 * Returns a displacement vector, writes scalar excitation into energy.
 */
vec3 historyField(vec3 x, vec3 gains, out float energy) {
  vec3 acc = vec3(0.0);
  energy = 0.0;
  float decay = max(uDecay, 0.05);
  float maxAge = 7.0 / decay;
  float r2 = uRadius * uRadius;
  for (int i = 0; i < HISTORY_SIZE; i++) {
    vec4 a = texelFetch(uHistory, ivec2(i, 0), 0);
    float age = uTime - a.w;
    if (age < 0.0 || age > maxAge) continue;
    vec4 b = texelFetch(uHistory, ivec2(i, 1), 0);
    vec3 dv = x - a.xyz;
    float d = length(dv);
    vec3 dir = dv / max(d, 1e-4);

    if (b.z > 1.5) {
      // Shock front: an expanding gaussian shell with geometric spreading loss.
      float front = age * 3.4 * b.w;
      float width = 0.26 + age * 0.32;
      float q = (d - front) / width;
      float shell = exp(-q * q) * (1.0 - 0.35 * q);
      float amp = shell * exp(-age * 0.95 * decay) / (1.0 + front * 0.45) * b.x;
      acc += dir * amp * gains.z;
      energy += abs(amp) * 1.4;
    } else if (b.z > 0.5) {
      // Gravity trace: the well lingers after the pointer has moved on.
      float fade = exp(-age * 1.7 * decay);
      float f = exp(-d * d / r2);
      acc -= dir * f * fade * b.x * gains.y * min(d, 1.0);
      energy += f * fade * b.x * 0.45;
    } else {
      // Move trace: a small wave packet travelling outward from each sample.
      float fade = exp(-age * 2.3 * decay);
      float front = age * 1.9;
      float q = (d - front) / 0.42;
      float env = exp(-q * q) * exp(-d / (uRadius * 1.25));
      float wave = sin((d - front) * 7.5);
      acc += dir * wave * env * fade * b.x * gains.x;
      energy += env * fade * b.x * 0.6;
    }
  }
  return acc * uStrength;
}

/*
 * Thin-lens gravitational lensing in the plane perpendicular to the view axis.
 * Maps a source position to its primary image (theta = (beta + sqrt(beta^2 + 4 thetaE^2)) / 2).
 */
vec3 lensImage(vec3 x, vec3 center, vec3 viewDir, float thetaE) {
  vec3 dv = x - center;
  vec3 perp = dv - dot(dv, viewDir) * viewDir;
  float beta = length(perp);
  vec3 dir = perp / max(beta, 1e-4);
  float theta = 0.5 * (beta + sqrt(beta * beta + 4.0 * thetaE * thetaE));
  return x + dir * (theta - beta);
}
`;
