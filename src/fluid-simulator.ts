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

interface VelocitField {
  textures: IDoubleTexture;
  data: number[];
}

interface IDoubleTexture {
  tex1: GPUTexture;
  tex2: GPUTexture;
  swap: () => void;
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
  velocity!: VelocitField;
  dye!: IDoubleTexture;

  constructor() {}

  static async create(canvas: HTMLCanvasElement) {
    const sim = new FluidSimulator();
    await sim.createGPUContext(sim, canvas);
    await sim.createPipelines();
    sim.createBuffers();
    sim.createRenderPassDescriptor();
    sim.velocity = {
      textures: sim.createDoubleTexture(),
      data: [0, 0],
    };
    sim.dye = sim.createDoubleTexture();
    sim.writeDyeTexture();
    sim.sampler = sim.device.createSampler();
    sim.writeVelocityTexture();

    // mouseVelocityListener(sim.resetVelocity, sim.size).subscribe(({ position, velocity }) => {
    // });
    sim.step();

    return sim;
  }

  step = () => {
    const colorAttachments = this.renderPassDescriptor.colorAttachments as GPURenderPassColorAttachment[];
    colorAttachments[0].view = this.ctx.getCurrentTexture();

    const dt = calcDeltaTime();
    this.diffuse(dt);
    this.advect(dt);
    this.render();

    requestAnimationFrame(this.step);
  };

  advect(dt: number) {
    let tex1 = this.dye.tex1;
    let tex2 = this.dye.tex2;
    const device = this.device;
    const pipeline = this.pipelines.advectPipeline;

    const advect = this.buffers.advect;
    const velocityTex = this.velocity.textures.tex1;
    advect.view[0] = dt;

    device.queue.writeBuffer(advect.buffer, 0, advect.data);

    const advectBindGroup = device.createBindGroup({
      label: "advect bind group",
      layout: pipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: tex1 },
        { binding: 1, resource: tex2 },
        { binding: 2, resource: velocityTex },
        { binding: 3, resource: advect.buffer },
      ],
    });

    const encoder = device.createCommandEncoder({ label: "compute diffusion encoder" });
    const computePass = encoder.beginComputePass();

    computePass.setPipeline(pipeline);
    computePass.setBindGroup(0, advectBindGroup);
    computePass.dispatchWorkgroups(config.TEXTURE_WIDTH, config.TEXTURE_HEIGHT, 1);

    computePass.end();

    const commandBuffer = encoder.finish();

    device.queue.submit([commandBuffer]);
    this.dye.swap();
  }

  diffuse(dt: number) {
    let tex1 = this.dye.tex1;
    let tex2 = this.dye.tex2;
    const device = this.device;
    const pipeline = this.pipelines.diffusionPipeline;
    const diffuse = this.buffers.diffuse;

    diffuse.view[0] = config.DIFFUSION;
    diffuse.view[1] = dt;
    device.queue.writeBuffer(diffuse.buffer, 0, diffuse.data);

    for (let i = 0; i < 100; i++) {
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
    }

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
  writeVelocityTexture() {
    const w = config.TEXTURE_WIDTH;
    const h = config.TEXTURE_HEIGHT;
    const size = w * h * 4;
    const textureData = new Uint8Array(size);
    const cx = w / 2;
    const cy = h / 2;

    for (let x = 0; x < w; x++) {
      for (let y = 0; y < h; y++) {
        const dx = x - cx;
        const dy = y - cy;
        // perpendicular to radius = rotation
        // normalize and scale to 0-255 range with 128 as zero
        const len = Math.sqrt(dx * dx + dy * dy) || 1;
        const vx = (-dy / len) * 20 + 128;
        const vy = (dx / len) * 20 + 128;

        const idx = (y * w + x) * 4;
        textureData[idx] = Math.min(100, Math.max(0, Math.round(vx)));
        textureData[idx + 1] = Math.min(100, Math.max(0, Math.round(vy)));
        textureData[idx + 2] = 0;
        textureData[idx + 3] = 0;
      }
    }

    this.device.queue.writeTexture({ texture: this.velocity.textures.tex1 }, textureData, { bytesPerRow: w * 4 }, { width: w, height: h });
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

  createDoubleTexture(): IDoubleTexture {
    const device = this.device;
    const textureWidth = config.TEXTURE_WIDTH;
    const textureHeight = config.TEXTURE_HEIGHT;

    let tex1 = createTexture("tex1", device, textureWidth, textureHeight);
    let tex2 = createTexture("tex2", device, textureWidth, textureHeight);

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
    this.velocity.data = [0, 0];
  };
}
