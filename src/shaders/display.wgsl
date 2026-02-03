struct VertexOut {
  @builtin(position) position : vec4f,
  @location(0) texcoord : vec2f,
}

struct Vertex {
  @location(0) position : vec2f
}

@vertex fn vs(
vert : Vertex,
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
  //-1 to 1
  var xy = vert.position;
  //0 to 2
  var zeroToTwo = xy * 2.0;
  //0 to 1
  var zeroToOne = zeroToTwo - 1.0;



  vsOut.position = vec4f(xy, 0.0, 1.0);
  vsOut.texcoord = (xy + 1.0) * 0.5;
  return vsOut;
}

@group(0) @binding(0) var ourSampler : sampler;
@group(0) @binding(1) var ourTexture : texture_2d<f32>;

@fragment fn fs(fsInput : VertexOut) -> @location(0) vec4f {
  return textureSample(ourTexture, ourSampler, fsInput.texcoord);
}
