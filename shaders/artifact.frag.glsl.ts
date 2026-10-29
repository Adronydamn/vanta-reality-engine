import { noiseGLSL } from "./noise.glsl";

export const artifactFragmentShader = /* glsl */ `
${noiseGLSL}

uniform float uTime;
uniform vec3 uModeWeights;
uniform vec3 uColDeep;
uniform vec3 uColMid;
uniform vec3 uColRim;
uniform vec3 uColHot;

varying vec3 vNormalW;
varying vec3 vWorld;
varying vec3 vObj;
varying float vEnergy;
varying float vTidal;

/* Procedural studio environment tinted by the active palette: gives the liquid-metal reflections. */
vec3 environment(vec3 dir) {
  float y = dir.y;
  float az = atan(dir.z, dir.x);
  vec3 col = mix(uColDeep * 0.3, uColMid * 0.45, smoothstep(-0.5, 1.0, y));
  // Two soft light strips wrapping the horizon.
  float strips = smoothstep(0.86, 1.0, sin(y * 4.2 + sin(az * 1.5 + uTime * 0.08) * 0.9) * 0.5 + 0.5);
  col += uColHot * strips * 0.45;
  // Horizon glow band.
  col += uColRim * pow(max(0.0, 1.0 - abs(y + 0.05) * 3.2), 5.0) * 0.7;
  // Key and fill softboxes.
  col += uColHot * pow(max(dot(dir, normalize(vec3(-0.55, 0.75, 0.55))), 0.0), 64.0) * 5.0;
  col += uColRim * pow(max(dot(dir, normalize(vec3(0.8, -0.2, 0.4))), 0.0), 20.0) * 1.0;
  return col;
}

void main() {
  vec3 N = normalize(vNormalW);
  vec3 V = normalize(cameraPosition - vWorld);
  float NdV = clamp(dot(N, V), 0.0, 1.0);
  float edge = 1.0 - NdV;
  float excite = clamp(vEnergy, 0.0, 2.5);

  // Dark metallic body: environment reflections weighted by Schlick fresnel.
  vec3 R = reflect(-V, N);
  float F = 0.07 + 0.93 * pow(edge, 4.0);
  vec3 col = uColDeep * 0.4 + environment(R) * F;

  // Inner energy: ridged noise veins visible through the face of the body.
  vec3 q = vObj * 2.1 + vec3(0.0, uTime * 0.22, uTime * 0.05);
  float warp = snoise(q * 0.7 + uTime * 0.08);
  float ridge = 1.0 - abs(snoise(q + warp * 0.7));
  float veins = pow(ridge, 9.0);
  float depth = pow(NdV, 1.6);
  vec3 veinCol = mix(uColRim, uColHot, clamp(veins * 0.7 + excite * 0.25, 0.0, 1.0));
  col += veinCol * veins * depth * (0.035 + excite * 1.3 + uModeWeights.z * 0.06);

  // Event-horizon rim and photon sphere.
  col += uColRim * pow(edge, 4.0) * (0.85 + excite * 1.4);
  col += uColHot * pow(edge, 10.0) * 1.5;

  // Tidal hot spot when the body is stretched by gravity.
  col += uColHot * clamp(vTidal, 0.0, 1.0) * 0.8 * (0.4 + veins);
  col += uColRim * excite * 0.18;

  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;
