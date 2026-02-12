
struct VertexOut {
  @builtin(position) position : vec4f,
  @location(0) texcoord : vec2f,
}

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
  var zeroToTwo = xy * 2.0;
  var zeroToOne = zeroToTwo - 1.0;

  vsOut.position = vec4f(xy, 0.0, 1.0);
  vsOut.texcoord = (xy + 1.0) * 0.5;
  return vsOut;
}

@group(0) @binding(0) var ourSampler : sampler;
@group(0) @binding(1) var ourTexture : texture_2d<f32>;

@fragment fn fs(fsInput : VertexOut) -> @location(0) vec4f {
  let uv = fsInput.texcoord;
  let dims = vec2f(textureDimensions(ourTexture));

  let sampled = textureSample(ourTexture, ourSampler, fsInput.texcoord);

  let texelcoords = uv * dims;
  let texel = floor(texelcoords);
  let center = vec2f(0.0, 0.0);
  let local = (texelcoords - texel) * 2 - 1;
  let coords = sampled.xy * 2 - 1;

  return drawLine(center, coords, local);
}

fn drawLine(p1 : vec2f, p2 : vec2f, p3 : vec2f) -> vec4f
{
  let p1p2 = p2 - p1;
  let p1p3 = p3 - p1;

  let d1 = dot(p1p2, p1p3);
  //|a|*|b|*cos a = d1
  let cos = d1 / (length(p1p2) * length(p1p3));
  let normalized = normalize(p1p2);
  let projDistance = d1 / length(p1p2);

  let p1p4 = normalized * projDistance;

  let dist = distance(p1p3, p1p4);

  if (dist <= 0.01 && length(p1p2) >= length(p1p4) && length(p1p2) > 0.2 && projDistance >=0)
  {
    return vec4f(1.0, 1.0, 1.0, 1.0);
  } else {
    return vec4f(0.0, 0.0, 0.0, 1.0);
  }
}
