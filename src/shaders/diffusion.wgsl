struct DensityStruct {
    diff: f32,
    dt: f32,
}

@group(0) @binding(0) var inputTexture: texture_2d<f32>;
@group(0) @binding(1) var outputTexture: texture_storage_2d<rgba8unorm, write>;
@group(0) @binding(2) var<uniform> densityInput: DensityStruct;

@compute @workgroup_size(1) fn computeVelocity(@builtin(global_invocation_id) id: vec3<u32>) {
    let position = id.xy;
    let dims = vec2f(textureDimensions(inputTexture));

    let diff = densityInput.diff;
    let dt = densityInput.dt;

    let center = id.xy;
    let left = vec2u(max(center.x, 1u) - 1u, center.y);
    let right = vec2u(min(center.x + 1u, u32(dims.x) - 1u), center.y);
    let top = vec2u(center.x, min(center.y + 1u, u32(dims.y) - 1u));
    let bottom = vec2u(center.x, max(center.y, 1u) - 1u);

    let densC = textureLoad(inputTexture, center, 0);
    let densL = textureLoad(inputTexture, left, 0);
    let densR = textureLoad(inputTexture, right, 0);
    let densT = textureLoad(inputTexture, top, 0);
    let densB = textureLoad(inputTexture, bottom, 0);

    //START SIM STEP
    let a = dt * diff * dims.x * dims.y;
    let newDens = (densC.r + a * (densL.r + densR.r + densB.r + densT.r)) / (1 + 4 * a);

    textureStore(outputTexture, position, vec4f(newDens, newDens, newDens, 1));
}
