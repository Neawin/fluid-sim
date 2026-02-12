import { fromEvent, switchMap, takeUntil } from "rxjs";
import { createDiffustionPipeline, createDisplayPipeline, createVelocityPipeline } from "./pipelines";

function randomColor() {
  return Math.floor(Math.random() * 255);
}

export async function run() {
  const canvas = document.querySelector("#webgpu-canvas") as HTMLCanvasElement;
  canvas.width = canvas.clientWidth * devicePixelRatio;
  canvas.height = canvas.clientHeight * devicePixelRatio;

  const size = { width: canvas.width, height: canvas.height };

  const adapter = await navigator.gpu.requestAdapter();
  const device = await adapter?.requestDevice();
  const ctx = canvas.getContext("webgpu") as GPUCanvasContext;

  if (!device) {
    throw new Error("Device not initialized!");
  }

  ctx.configure({
    device: device,
    format: navigator.gpu.getPreferredCanvasFormat(),
  });

  const mousedown$ = fromEvent(window, "mousedown");
  const mousemove$ = fromEvent(window, "mousemove");
  const mouseup$ = fromEvent(window, "mouseup");

  mousedown$.pipe(switchMap(() => mousemove$.pipe(takeUntil(mouseup$)))).subscribe((e) => {
    const ev = e as MouseEvent;
    x = ev.x / size.width;
    y = 1.0 - ev.y / size.height;
  });
  const displayPipeline = await createDisplayPipeline(device);
  const velocityPipeline = await createVelocityPipeline(device);
  const diffustionPipeline = await createDiffustionPipeline(device);

  // 2 * 32float
  const uniformBufferSize = 4 * 4;
  const uniformBuffer = device.createBuffer({
    label: "uniform buffor",
    size: uniformBufferSize,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });

  let x = 0;
  let y = 0;

  const textureWidth = 24;
  const textureHeight = 20;

  const data = initTextureData(textureWidth, textureHeight);

  const textureData = new Uint8Array(data.flat());

  let texture1 = createTexture(device, textureWidth, textureHeight);
  let texture2 = createTexture(device, textureWidth, textureHeight);

  device.queue.writeTexture({ texture: texture1 }, textureData, { bytesPerRow: textureWidth * 4 }, { width: textureWidth, height: textureHeight });
  const sampler = device.createSampler();

  const renderPassDescriptor: GPURenderPassDescriptor = {
    label: "my render pass descriptor",
    colorAttachments: [
      {
        view: ctx.getCurrentTexture().createView(),
        clearValue: [0.3, 0.3, 0.3, 1],
        loadOp: "clear",
        storeOp: "store",
      },
    ],
  };

  const frame = async () => {
    const displayBindGroup = device.createBindGroup({
      label: "display Bind group",
      layout: displayPipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: sampler },
        { binding: 1, resource: texture1 },
      ],
    });

    const velocityBindGroup = device.createBindGroup({
      label: "velocity bind group",
      layout: velocityPipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: texture1 },
        { binding: 1, resource: texture2 },
        { binding: 2, resource: uniformBuffer },
      ],
    });

    const diffustionBindGroup = device.createBindGroup({
      label: "diffusion bind group",
      layout: diffustionPipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: texture2 },
        { binding: 1, resource: texture1 },
      ],
    });

    const uniformValues = new Float32Array([x, y, 0.1, 0.1]);

    device.queue.writeBuffer(uniformBuffer, 0, uniformValues);

    const colorAttachments = renderPassDescriptor.colorAttachments as GPURenderPassColorAttachment[];
    colorAttachments[0].view = ctx.getCurrentTexture();

    const encoder = device.createCommandEncoder({ label: "my encoder" });

    const computePass = encoder.beginComputePass();

    // VELOCITY PASS
    computePass.setPipeline(velocityPipeline);
    computePass.setBindGroup(0, velocityBindGroup);
    computePass.dispatchWorkgroups(textureWidth, textureHeight, 1);

    // DIFFUSTION PASS
    computePass.setPipeline(diffustionPipeline);
    computePass.setBindGroup(0, diffustionBindGroup);
    computePass.dispatchWorkgroups(textureWidth, textureHeight, 1);

    computePass.end();

    const renderPass = encoder.beginRenderPass(renderPassDescriptor);

    renderPass.setPipeline(displayPipeline);
    renderPass.setBindGroup(0, displayBindGroup);
    renderPass.draw(6);
    renderPass.end();

    const commandBuffer = encoder.finish();
    device.queue.submit([commandBuffer]);

    // let temp = texture1;
    // texture1 = texture2;
    // texture2 = temp;

    requestAnimationFrame(frame);
  };

  frame();
}

function initTextureData(width: number, height: number): number[][] {
  const data: number[][] = [];
  for (let i = 0; i < width; i++) {
    for (let j = 0; j < height; j++) {
      const pointData = [randomColor(), randomColor(), 0, 0];
      data.push(pointData);
    }
  }
  return data;
}

function createTexture(device: GPUDevice, width: number, height: number) {
  const tex = device.createTexture({
    label: "my texture",
    size: [width, height],
    dimension: "2d",
    format: "rgba8unorm",
    usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.COPY_SRC | GPUTextureUsage.STORAGE_BINDING,
  });

  return tex;
}
