struct VertexOut {
  @builtin(position) position : vec4f,
  @location(0) texcoord : vec2f,
}

@group(0) @binding(0) var ourSampler : sampler;
@group(0) @binding(1) var ourTexture : texture_2d<f32>;

@vertex fn vs(
@builtin(vertex_index) vertexIndex : u32
) -> VertexOut {
  let pos = array(
  vec2f(-1, 1),
  vec2f(-1, -1),
  vec2f(1, 1),
  vec2f(-1, -1),
  vec2f(1, -1),
  vec2f(1, 1)
  );

  var vsOut : VertexOut;
  var xy = pos[vertexIndex];
  var uv = xy * 0.5 + 0.5;

  vsOut.position = vec4f(xy, 0.0, 1.0);
  vsOut.texcoord = uv;
  return vsOut;
}

@fragment fn fs(fsInput : VertexOut) -> @location(0) vec4f {
  return textureSample(ourTexture, ourSampler, fsInput.texcoord);
}
