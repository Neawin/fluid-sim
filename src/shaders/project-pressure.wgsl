@group(0) @binding(0) var inVelocity: texture_2d<f32>;
@group(0) @binding(1) var outVelocity: texture_storage_2d<rgba8snorm, write>;
@group(0) @binding(2) var inProject: texture_2d<f32>;

@compute @workgroup_size(1) fn computeVelocity(@builtin(global_invocation_id) id: vec3<u32>) {
    let position = id.xy;
    let dims = vec2f(textureDimensions(inVelocity));

    let center = id.xy;
    let left = vec2u(max(center.x, 1u) - 1u, center.y);
    let right = vec2u(min(center.x + 1u, u32(dims.x) - 1u), center.y);
    let top = vec2u(center.x, min(center.y + 1u, u32(dims.y) - 1u));
    let bottom = vec2u(center.x, max(center.y, 1u) - 1u);

    let vC = textureLoad(inVelocity, center, 0);

    let pL = textureLoad(inProject, left, 0);
    let pR = textureLoad(inProject, right, 0);
    let pT = textureLoad(inProject, top, 0);
    let pB = textureLoad(inProject, bottom, 0);

    var u = (vC.x - 0.5 * (pR.y - pL.y));
    var v = (vC.y - 0.5 * (pT.y - pB.y));

    textureStore(outVelocity, position, vec4f(u, v, 1, 1.0));
}
