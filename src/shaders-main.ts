// import { debounceTime, finalize, fromEvent, merge, switchMap, takeUntil } from "rxjs";
// import { getVelocity, resetPosition } from "./utils";
// import { createTexture, initTextureData } from "./texture";
// import { createPipelines, type IPipelines } from "./pipelines";

// export async function run() {

//   const step = async () => {
//     const colorAttachments = renderPassDescriptor.colorAttachments as GPURenderPassColorAttachment[];
//     colorAttachments[0].view = ctx.getCurrentTexture();

//     const dt = calcDeltaTime();

//     densityF32[0] = 0.6;
//     densityF32[1] = dt;
//     device.queue.writeBuffer(densityUniformBuffer, 0, densityUniformData);

//     const { diffusionPipeline, velocityPipeline, basePipeline } = pipelines;

//     for (let i = 0; i < 20; i++) {
//       const diffusionBindGroup = device.createBindGroup({
//         label: "diffusion bind group",
//         layout: diffusionPipeline.getBindGroupLayout(0),
//         entries: [
//           { binding: 0, resource: dTexture1 },
//           { binding: 1, resource: dTexture2 },
//           { binding: 2, resource: densityUniformBuffer },
//         ],
//       });
//       const encoder = device.createCommandEncoder({ label: "compute diffusion encoder" });
//       const computePass = encoder.beginComputePass();

//       // DIFFUSION PASS
//       computePass.setPipeline(diffusionPipeline);
//       computePass.setBindGroup(0, diffusionBindGroup);
//       computePass.dispatchWorkgroups(textureWidth, textureHeight, 1);

//       computePass.end();

//       const commandBuffer = encoder.finish();

//       device.queue.submit([commandBuffer]);

//       let temp = dTexture1;
//       dTexture1 = dTexture2;
//       dTexture2 = temp;
//     }

//     const baseBindGroup = device.createBindGroup({
//       label: "display Bind group",
//       layout: basePipeline.getBindGroupLayout(0),
//       entries: [
//         { binding: 0, resource: sampler },
//         { binding: 1, resource: dTexture1 },
//       ],
//     });

//     const renderEncoder = device.createCommandEncoder({ label: "Render Encoder" });

//     const renderPass = renderEncoder.beginRenderPass(renderPassDescriptor);

//     renderPass.setPipeline(basePipeline);
//     renderPass.setBindGroup(0, baseBindGroup);
//     renderPass.draw(6);
//     renderPass.end();

//     device.queue.submit([renderEncoder.finish()]);

//     prevTime = performance.now();
//     requestAnimationFrame(step);
//   };

//   step();
// }
