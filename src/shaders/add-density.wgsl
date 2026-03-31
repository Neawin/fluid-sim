const RADIUS = 20;

struct DensityUniform {
    mousePos: vec2f,
}

@group(0) @binding(0) var inputTexture: texture_2d<f32>;
@group(0) @binding(1) var outputTexture: texture_storage_2d<rgba8unorm, write>;
@group(0) @binding(2) var<uniform> densUniform: DensityUniform;

@compute @workgroup_size(1) fn computeVelocity(@builtin(global_invocation_id) id: vec3<u32>) {
    let position = id.xy;
    let dims = vec2f(textureDimensions(inputTexture));
    let pos = densUniform.mousePos * dims;

    let d = distance(pos, vec2f(position));

    let c = textureLoad(inputTexture, position, 0);
    let s = smoothstep(0.0, RADIUS, d);
    let white = vec4f(1, 0, 0, 0.4);

    if d <= RADIUS {
        textureStore(outputTexture, position, mix(white, c, s));
    }
}
