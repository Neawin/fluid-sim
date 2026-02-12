@group(0) @binding(0) var inputTexture : texture_2d<f32>;
@group(0) @binding(1) var outputTexture : texture_storage_2d < rgba8unorm, write>;

@compute @workgroup_size(1) fn computeVelocity(@builtin(global_invocation_id) id : vec3 <u32>)
{
  let position = id.xy;

  //velocity is in 0-1 range right now with center point beign 0.5 0.5
  let baseVelocity = textureLoad(inputTexture, position, 0);
  //need to update to -1 to 1 range with 0 beign in middle
  let velocity = baseVelocity * 2 - 1;


  let decay = 0.97;
  let targetVelocity = vec2f(0.0, 0.0);

  var newVelocity = mix(targetVelocity, velocity.rg, decay);

  //seems like distance is not correctly checkced or velocity is not set to 0.0 0.0 to totally disappear line ?
  let d = distance(newVelocity, targetVelocity);
  if (d < 0.1)
  {
    newVelocity = vec2f(0.0, 0.0);
  }
  let normVelocity = (newVelocity + 1) / 2;
  textureStore(outputTexture, position, vec4f(normVelocity, 0.0, 1.0));
}
