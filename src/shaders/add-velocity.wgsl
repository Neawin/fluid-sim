const RADIUS = 20;

struct VelocityUniform {
    delta: vec2f,
    position: vec2f,
}

@group(0) @binding(0) var inVelocity: texture_2d<f32>;
@group(0) @binding(1) var outVelocity: texture_storage_2d<rgba8unorm, write>;
@group(0) @binding(2) var<uniform> velUniform: VelocityUniform;

@compute @workgroup_size(1) fn computeVelocity(@builtin(global_invocation_id) id: vec3<u32>) {
    let position = id.xy;
    let dims = vec2f(textureDimensions(inVelocity));
    // ????
    let delta = velUniform.delta * 0.5 + 0.5;

    let pos = velUniform.position * dims;

    let d = distance(pos, vec2f(position));

    let v = textureLoad(inVelocity, position, 0);
    let s = smoothstep(0.0, RADIUS, d);
    let velocity = vec4f(delta, 1, 1);

    if d <= RADIUS {
        textureStore(outVelocity, position, velocity);
    }
}
