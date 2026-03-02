import { config } from "./config";
import { mouseVelocityListener } from "./mouse";
import { createPipelines, type IPipelines } from "./pipelines";
import { createTexture, initTextureData } from "./texture";
import { calcDeltaTime } from "./utils";

interface IBuffer {
  buffer: GPUBuffer;
  size: number;
  data: ArrayBuffer;
  view: Float32Array;
}

export class FluidSimulator {
  device!: GPUDevice;
  texture!: GPUTexture[];
  ctx!: GPUCanvasContext;
  pipelines!: IPipelines;
  renderPassDescriptor!: GPURenderPassDescriptor;
  sampler!: GPUSampler;
  buffers!: {
    advect: IBuffer;
    diffuse: IBuffer;
  };
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
    sim.writeDyeTexture();
    sim.sampler = sim.device.createSampler();

    // mouseVelocityListener(sim.resetVelocity, sim.size).subscribe(({ position, velocity }) => {
    // });
    sim.step();

    return sim;
  }

  step = () => {
    const colorAttachments = this.renderPassDescriptor.colorAttachments as GPURenderPassColorAttachment[];
    colorAttachments[0].view = this.ctx.getCurrentTexture();

    this.diffuse();
    this.advect();
    this.render();

    requestAnimationFrame(this.step);
  };

  advect() {
    const dt = calcDeltaTime();
    let tex1 = this.dye.tex1;
    let tex2 = this.dye.tex2;
    const device = this.device;
    const pipeline = this.pipelines.diffusionPipeline;
    const n = config.TEXTURE_HEIGHT * config.TEXTURE_WIDTH;
    const dt0 = dt * n;

    const advect = this.buffers.advect;
    console.log(advect);
  }

  diffuse() {
    const dt = calcDeltaTime();
    let tex1 = this.dye.tex1;
    let tex2 = this.dye.tex2;
    const device = this.device;
    const pipeline = this.pipelines.diffusionPipeline;
    const diffuse = this.buffers.diffuse;

    diffuse.view[0] = 0.6;
    diffuse.view[1] = dt;
    device.queue.writeBuffer(diffuse.buffer, 0, diffuse.data);

    const diffusionBindGroup = device.createBindGroup({
      label: "diffusion bind group",
      layout: pipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: tex1 },
        { binding: 1, resource: tex2 },
        { binding: 2, resource: diffuse.buffer },
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

    this.dye.swap();
  }

  createBuffers() {
    this.buffers = {
      advect: this.createUniformBuffer("diffusion buffer", 2 * 4),
      diffuse: this.createUniformBuffer("diffusion buffer", 2 * 4),
    };
  }

  createUniformBuffer(label: string, size: number): IBuffer {
    const data = new ArrayBuffer(size);
    const buffer = this.device.createBuffer({
      label,
      size,
      usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.UNIFORM,
    });
    const view = new Float32Array(data);
    return {
      data,
      size,
      buffer,
      view,
    };
  }

  render() {
    const device = this.device;
    const pipeline = this.pipelines.basePipeline;
    const tex1 = this.dye.tex1;

    const baseBindGroup = device.createBindGroup({
      label: "display Bind group",
      layout: pipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: this.sampler },
        { binding: 1, resource: tex1 },
      ],
    });

    const renderEncoder = device.createCommandEncoder({ label: "Render Encoder" });

    const renderPass = renderEncoder.beginRenderPass(this.renderPassDescriptor);

    renderPass.setPipeline(pipeline);
    renderPass.setBindGroup(0, baseBindGroup);
    renderPass.draw(6);
    renderPass.end();

    device.queue.submit([renderEncoder.finish()]);
  }

  writeDyeTexture() {
    const rawData = initTextureData(config.TEXTURE_WIDTH, config.TEXTURE_HEIGHT);
    const textureData = new Uint8Array(rawData.flat());
    this.device.queue.writeTexture(
      { texture: this.dye.tex1 },
      textureData,
      { bytesPerRow: config.TEXTURE_WIDTH * 4 },
      { width: config.TEXTURE_WIDTH, height: config.TEXTURE_HEIGHT },
    );
  }

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
      get tex1() {
        return tex1;
      },
      get tex2() {
        return tex2;
      },
      swap: () => {
        let temp = tex1;
        tex1 = tex2;
        tex2 = temp;
      },
    };
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
