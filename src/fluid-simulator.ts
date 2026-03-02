import { config } from "./config";
import { mouseVelocityListener } from "./mouse";
import { createPipelines, type IPipelines } from "./pipelines";
import { createTexture, initTextureData } from "./texture";
import { calcDeltaTime } from "./utils";

export class FluidSimulator {
  device!: GPUDevice;
  texture!: GPUTexture[];
  ctx!: GPUCanvasContext;
  pipelines!: IPipelines;
  renderPassDescriptor!: GPURenderPassDescriptor;
  buffers: any = { densityUniformBuffer: null };
  size = { width: 0, height: 0 };
  velocity!: any;
  dye!: any;

  constructor() {}

  static async create(canvas: HTMLCanvasElement) {
    const sim = new FluidSimulator();
    await sim.createGPUContext(sim, canvas);
    await sim.createPipelines();
    sim.createBuffers();
    sim.createRenderPassDescriptor();
    sim.velocity = sim.createDoubleTexture();
    sim.dye = sim.createDoubleTexture();

    // const rawData = initTextureData(textureWidth, textureHeight);
    // const textureData = new Uint8Array(rawData.flat());

    // sim.device.queue.writeTexture({ texture: tex1 }, textureData, { bytesPerRow: textureWidth * 4 }, { width: textureWidth, height: textureHeight });
    // const sampler = sim.device.createSampler();
    // velocity = sim.createTextures(sim);
    // density = sim;

    // mouseVelocityListener(sim.resetVelocity, sim.size).subscribe(({ position, velocity }) => {
    // sim.velocity = velocity;
    // sim.position = position;
    // });

    sim.step();

    return sim;
  }

  step = () => {
    const colorAttachments = this.renderPassDescriptor.colorAttachments as GPURenderPassColorAttachment[];
    colorAttachments[0].view = this.ctx.getCurrentTexture();

    this.diffuse();

    this.render();

    requestAnimationFrame(this.step);
  };

  diffuse() {
    const dt = calcDeltaTime();
    let tex1 = this.dye.tex1;
    let tex2 = this.dye.tex2;
    const device = this.device;
    const pipeline = this.pipelines.diffusionPipeline;
    const densityUniformData = new ArrayBuffer(2 * 4);
    const densityF32 = new Float32Array(densityUniformData);
    densityF32[0] = 0.6;
    densityF32[1] = dt;
    device.queue.writeBuffer(this.buffers.densityUniformBuffer, 0, densityUniformData);

    for (let i = 0; i < 20; i++) {
      const diffusionBindGroup = device.createBindGroup({
        label: "diffusion bind group",
        layout: pipeline.getBindGroupLayout(0),
        entries: [
          { binding: 0, resource: tex1 },
          { binding: 1, resource: tex2 },
          { binding: 2, resource: this.buffers.densityUniformBuffer },
        ],
      });
      const encoder = device.createCommandEncoder({ label: "compute diffusion encoder" });
      const computePass = encoder.beginComputePass();

      computePass.setPipeline(pipeline);
      computePass.setBindGroup(0, diffusionBindGroup);
      computePass.dispatchWorkgroups(config.TEXTURE_WIDTH, config.TEXTURE_HEIGHT, 1);

      computePass.end();

      const commandBuffer = encoder.finish();

      device.queue.submit([commandBuffer]);

      let temp = tex1;
      tex1 = tex2;
      tex2 = temp;
    }
  }

  render() {}

  createRenderPassDescriptor() {
    const renderPassDescriptor: GPURenderPassDescriptor = {
      label: "my render pass descriptor",
      colorAttachments: [
        {
          view: this.ctx.getCurrentTexture().createView(),
          clearValue: [0.3, 0.3, 0.3, 1],
          loadOp: "clear",
          storeOp: "store",
        },
      ],
    };
    this.renderPassDescriptor = renderPassDescriptor;
  }

  createDoubleTexture() {
    const device = this.device;
    const textureWidth = config.TEXTURE_WIDTH;
    const textureHeight = config.TEXTURE_HEIGHT;

    let tex1 = createTexture(device, textureWidth, textureHeight);
    let tex2 = createTexture(device, textureWidth, textureHeight);

    return {
      tex1,
      tex2,
      swap: () => {
        let temp = tex1;
        tex1 = tex2;
        tex2 = temp;
      },
    };
  }

  createBuffers() {
    const device = this.device;
    const densityUniformSize = 2 * 4;
    const densityUniformBuffer = device.createBuffer({
      label: "density Uniform buffer",
      size: densityUniformSize,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    this.buffers.densityUniformBuffer = densityUniformBuffer;
  }

  async createPipelines() {
    const pipelines: IPipelines = await createPipelines(this.device);
    this.pipelines = pipelines;
  }

  async createGPUContext(sim: FluidSimulator, canvas: HTMLCanvasElement) {
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
    sim.ctx = ctx;
    sim.device = device;
    sim.size = size;
    return sim;
  }

  resetVelocity = () => {
    this.velocity = [0, 0];
  };
}
