struct UniformStruct {
  position : vec2f,
  delta : vec2f
}

@group(0) @binding(0) var inputTexture : texture_2d<f32>;
@group(0) @binding(1) var outputTexture : texture_storage_2d < rgba8unorm, write>;
@group(0) @binding(2) var<uniform> uniforms : UniformStruct;

@compute @workgroup_size(1) fn computeVelocity(@builtin(global_invocation_id) id : vec3 <u32>)
{
  //ok so i have some position that represents texel and im gonna go by each texel from my understanding
  let texel = id.xy;
  let dims = vec2f(textureDimensions(inputTexture));

  //this loads color for texel, velocity to be exact at this texel
  let velocity = textureLoad(inputTexture, texel, 0);
  //that should make velocity in -1 to 1 range
  let updatedVelocity = velocity.rg * 2 - 1;

  let mouseTexelPos = vec2u(floor(uniforms.position * dims));
  let delta = uniforms.delta;


  if (all(mouseTexelPos == texel))
  {
    let newVelocity = updatedVelocity + delta;
    let normVelocity = (newVelocity + 1) / 2;
    textureStore(outputTexture, texel, vec4f(normVelocity, 0.0, 1.0));
  } else {
    textureStore(outputTexture, texel, velocity);
  }
}
