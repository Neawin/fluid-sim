const ARROW_HEAD_WIDTH : f32 = 0.2;
const ARROW_HEAD_HEIGHT : f32 = 0.4;
const ARROW_HEAD_ANTIALIAS : f32 = 64.0;
const ARROW_STEM_THICKNESS : f32 = 0.05;
const ARROW_STEM_ANTIALIAS : f32 = 6;
const PI = 3.14;
const SCALE = 2;

struct VertexIn {
  @builtin(vertex_index) vertIndex : u32,
  @builtin(instance_index) index : u32,
}

struct VertexOut {
  @builtin(position) position : vec4f,
  @location(0) texcoord : vec2f,
  @location(1) velocity : vec2f,
}

@group(0) @binding(0) var ourTexture : texture_2d<f32>;
@group(0) @binding(1) var<uniform> resolution : vec2f;

@vertex fn vs(
vert : VertexIn
) -> VertexOut {
  var vsOut : VertexOut;
  let dims = vec2f(textureDimensions(ourTexture));
  let cellX = f32(vert.index) % dims.x;
  let cellY = floor(f32(vert.index) / dims.x);

  //-1 - 1
  let velocity = vec2f(textureLoad(ourTexture, vec2u(u32(cellX), u32(cellY)), 0).xy) * 2 - 1;


  let pos = array(
  vec2f(-1, 1),
  vec2f(-1, -1),
  vec2f(1, 1),
  vec2f(-1, -1),
  vec2f(1, -1),
  vec2f(1, 1)
  );


  //cells position in 0-1 clipsace so 0.03 0.06 etc.
  let u = ((cellX + 0.5) / dims.x) * 2 - 1;
  let v = ((cellY + 0.5) / dims.y) * 2 - 1;

  //-1 .. 1 clipspace always
  let xy = pos[vert.vertIndex];
  //position to 0 .. 1 position
  //let uv = xy * 0.5 + 0.5;

  let offset = vec2f(u, v);

  vsOut.position = vec4f((xy / dims) + offset, 0, 1);
  vsOut.texcoord = xy;
  vsOut.velocity = velocity;

  return vsOut;
}

@fragment fn fs(fsInput : VertexOut) -> @location(0) vec4f {
  //-1 to 1
  let velocity = fsInput.velocity;
  let uv = fsInput.texcoord;
  var mag = length(velocity);
  if (mag < 0.02)
  {
    return vec4f(0, 0, 0, 0);
  }

  var arrow : Arrow;
  arrow.base = vec2f(0, 0);
  arrow.dir = atan2(velocity.y, velocity.x);
  arrow.norm = mag;
  return vec4f(1, 0, 0, drawArrow(uv, arrow));
}

struct Arrow {
  base : vec2f,
  dir : f32,
  norm : f32
}

fn drawArrow(uv : vec2f, arrow : Arrow) -> f32 {
  let base = arrow.base;
  let norm = arrow.norm;
  let dir = arrow.dir;

  let rotated = mat2x2 < f32 > (cos(dir), - sin(dir), sin(dir), cos(dir)) * uv;
  let stemLen = max(0, norm - ARROW_HEAD_HEIGHT);
  var stem = dfLineSegment(rotated, base, base + vec2(stemLen, 0));

  var headA = base + vec2f(norm, 0);
  var headB = base + vec2f(stemLen, ARROW_HEAD_WIDTH);
  var headC = base + vec2f(stemLen, -ARROW_HEAD_WIDTH);

  var head = sdfTriangle(rotated, headA, headB, headC);

  //min , max , input
  stem = smoothstep(ARROW_STEM_ANTIALIAS / resolution.y, 0, stem);
  head = smoothstep(0, ARROW_HEAD_ANTIALIAS / resolution.y, head);

  return max(stem, head);
}

fn sdfTriangle(vP : vec2f, vA : vec2f, vB : vec2f, vC : vec2f) -> f32
{
  let AB = vB - vA;
  let AC = vC - vA;
  let AP = vP - vA;

  //3 areas, 2 sub 1 big
  let ABAC = AB.x * AC.y - AB.y * AC.x;
  let APAC = AP.x * AC.y - AP.y * AC.x;
  let APAB = AB.x * AP.y - AB.y * AP.x;
  let inv = 1 / ABAC;

  let baryX = APAC * inv;
  let baryY = APAB * inv;
  let baryZ = 1 - baryX - baryY;

  return min(min(baryX, baryY), baryZ);
}

fn dfLineSegment(vecP : vec2f, vecA : vec2f, vecB : vec2f) -> f32
{
  var AP = vecP - vecA;
  var AB = vecB - vecA;
  var projScalar = dot(AP, AB) / dot(AB, AB);
  var projAPAB = AB * clamp(projScalar, 0, 1);
  return distance (AP, projAPAB) - ARROW_STEM_THICKNESS;
}
