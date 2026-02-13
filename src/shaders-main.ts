import { debounceTime, finalize, fromEvent, interval, merge, switchMap, takeUntil, timeout, timer } from "rxjs";
import { getVelocity } from "./utils";
import { createTexture, initTextureData } from "./texture";
import { createPipelines, type IPipelines } from "./pipelines";

let position = [0, 0];
let velocity = [0, 0];

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
  const mouseStopped$ = mousemove$.pipe(debounceTime(200));

  mousedown$
    .pipe(
      switchMap(() =>
        merge(mousemove$, mouseStopped$).pipe(
          takeUntil(mouseup$),
          finalize(() => {
            velocity = [0, 0];
          }),
        ),
      ),
    )
    .subscribe((e) => {
      const ev = e as MouseEvent;
      const xnorm = ev.x / size.width;
      const ynorm = 1.0 - ev.y / size.height;
      velocity = getVelocity(ev);
      console.log(velocity);
      position = [xnorm, ynorm];
    });

  const pipelines: IPipelines = await createPipelines(device);

  // 2 * 32float
  const uniformBufferSize = 4 * 4;
  const uniformBuffer = device.createBuffer({
    label: "uniform buffor",
    size: uniformBufferSize,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });

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
    const { diffusionPipeline, velocityPipeline, displayPipeline } = pipelines;
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
      layout: diffusionPipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: texture2 },
        { binding: 1, resource: texture1 },
      ],
    });

    const uniformValues = new Float32Array([...position, ...velocity]);

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
    computePass.setPipeline(diffusionPipeline);
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

    requestAnimationFrame(frame);
  };

  frame();
}
