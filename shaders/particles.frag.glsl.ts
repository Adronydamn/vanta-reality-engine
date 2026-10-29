export const particlesFragmentShader = /* glsl */ `
varying vec3 vColor;
varying float vAlpha;

void main() {
  vec2 c = gl_PointCoord - 0.5;
  float r2 = dot(c, c) * 4.0;
  if (r2 > 1.0) discard;
  float core = exp(-r2 * 9.0);
  float halo = exp(-r2 * 2.5) * 0.3;
  float a = (core + halo) * vAlpha * (1.0 - r2);
  gl_FragColor = vec4(vColor, a);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;
