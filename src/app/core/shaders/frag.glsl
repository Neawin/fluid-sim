#version 300 es

precision highp float;

out vec4 outColor;

in vec2 v_texcoord;
uniform sampler2D u_texture;
uniform vec2 u_resolution;
uniform vec2 u_texelSize;
uniform vec2 u_mouse;
uniform vec2 u_time;

void main() {
  vec2 texelIndex = v_texcoord / u_texelSize;
  vec2 local = fract(texelIndex);              // [0..1] position within texel

  vec2 p1 = texture(u_texture, v_texcoord).rg; // point inside texel (data)
  vec2 p2 = vec2(0.5);                         // texel center
  vec2 p3 = local;                             // current fragment inside texel

  float thickness = 0.01;

  vec2 p1p2 = p2 - p1;
  vec2 p1p3 = p3 - p1;

  float d = dot(p1p3, p1p2) / length(p1p2);

  vec2 p4 = p1 + normalize(p1p2) * d;

  float dist = distance(p4, p3);

  outColor = vec4(0.5, 0.5, 0.5, 1.0) * texture(u_texture, v_texcoord);
  if(dist <= thickness && length(p4 - p1) <= length(p1p2) && length(p4 - p2) <= length(p1p2)) {
    outColor = vec4(1.0, 1.0, 1.0, 1.0);
  }
}