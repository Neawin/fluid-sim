struct AdvectStruct {
  dt : f32
}

@group(0) @binding(0) var inputTexture : texture_2d<f32>;
@group(0) @binding(1) var outputTexture : texture_storage_2d < rgba8unorm, write>;
@group(0) @binding(2) var velocityTexture : texture_2d<f32>;
@group(0) @binding(3) var<uniform> advInput : AdvectStruct;

@compute @workgroup_size(1) fn computeVelocity(@builtin(global_invocation_id) id : vec3 <u32>)
{
  let position = id.xy;
  let dims = vec2f(textureDimensions(inputTexture));
  let vel = textureLoad(velocityTexture, position, 0);
  let n = dims.x;

  let dt = advInput.dt;
  let dt0 = dt * n;

  let velX = vel.x - 0.5;
  let velY = vel.y - 0.5;

  //advect step
  var x = f32(id.x) - dt0 * velX;
  var y = f32(id.y) - dt0 * velY;

  x = clamp(x, 0.5, n + 0.5);
  y = clamp(y, 0.5, n + 0.5);

  let i0 = floor(x);
  let j0 = floor(y);

  let i1 = i0 + 1;
  let j1 = j0 + 1;

  let s1 = x - i0;
  let s0 = 1 - s1;

  let t1 = y - j0;
  let t0 = 1 - t1;

  let d1 = textureLoad(inputTexture, vec2u(u32(i0), u32(j0)), 0);
  let d2 = textureLoad(inputTexture, vec2u(u32(i0), u32(j1)), 0);
  let d3 = textureLoad(inputTexture, vec2u(u32(i1), u32(j0)), 0);
  let d4 = textureLoad(inputTexture, vec2u(u32(i1), u32(j1)), 0);

  let d = s0 * (t0 * d1 + t1 * d2) + s1 * (t0 * d3 + t1 * d4);

  textureStore(outputTexture, position, vec4f(d.r, d.r, d.r, 1.0));
}
