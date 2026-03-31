@group(0) @binding(0) var inVelocity: texture_2d<f32>;
@group(0) @binding(1) var outProject: texture_storage_2d<rgba8snorm, write>;

@compute @workgroup_size(1) fn computeVelocity(@builtin(global_invocation_id) id: vec3<u32>) {
    let position = id.xy;
    let dims = vec2f(textureDimensions(inVelocity));

    let center = id.xy;
    let left = vec2u(max(center.x, 1u) - 1u, center.y);
    let right = vec2u(min(center.x + 1u, u32(dims.x) - 1u), center.y);
    let top = vec2u(center.x, min(center.y + 1u, u32(dims.y) - 1u));
    let bottom = vec2u(center.x, max(center.y, 1u) - 1u);

    let vC = textureLoad(inVelocity, center, 0);
    let vL = textureLoad(inVelocity, left, 0);
    let vR = textureLoad(inVelocity, right, 0);
    let vT = textureLoad(inVelocity, top, 0);
    let vB = textureLoad(inVelocity, bottom, 0);

    let div = -0.5 * (vR.x - vL.x + vT.y - vB.y);

    textureStore(outProject, position, vec4f(div, 0.5, 0.0, 1.0));
}
