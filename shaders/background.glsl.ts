import { noiseGLSL } from "./noise.glsl";

export const backgroundVertexShader = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = position.xy * 0.5 + 0.5;
  gl_Position = vec4(position.xy, 0.9999, 1.0);
}
`;

export const backgroundFragmentShader = /* glsl */ `
${noiseGLSL}

uniform float uTime;
uniform float uAspect;
uniform float uSeed;
uniform vec3 uColBg;
uniform vec3 uColHaze;
uniform vec3 uColRim;

varying vec2 vUv;

float hash21(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

void main() {
  vec2 p = vUv - 0.5;
  p.x *= uAspect;
  float r = length(p);

  vec3 col = uColBg;

  // Faint deep-space haze.
  float n1 = snoise(vec3(p * 1.5, uTime * 0.015 + uSeed)) * 0.5 + 0.5;
  float n2 = snoise(vec3(p * 3.8 + 4.0, uTime * 0.025 - uSeed)) * 0.5 + 0.5;
  float haze = pow(n1 * 0.7 + n2 * 0.3, 2.4) * smoothstep(1.2, 0.05, r);
  col += uColHaze * haze * 0.5;
  col += uColHaze * exp(-r * r * 4.5) * 0.35;
  col += uColRim * exp(-r * r * 18.0) * 0.04;

  // Sparse, softly twinkling stars.
  vec2 grid = vUv * vec2(uAspect, 1.0) * 380.0;
  vec2 cell = floor(grid);
  float h = hash21(cell);
  if (h > 0.9965) {
    vec2 f = fract(grid) - 0.5;
    float star = exp(-dot(f, f) * 18.0);
    float tw = 0.55 + 0.45 * sin(uTime * (0.6 + h * 2.0) + h * 80.0);
    col += mix(uColHaze * 4.0, vec3(0.9), 0.6) * star * tw * fract(h * 97.0) * 0.35;
  }

  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;
