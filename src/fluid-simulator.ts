import { config } from "./config";
import type { IBindingGroups, IBuffer, IDoubleTexture, VelocitField } from "./models";
import { mouseVelocityListener } from "./mouse";
import { createPipelines, type IPipelines } from "./pipelines";
import { createDoubleTexture, createTexture, initTextureData, initVelocityData } from "./texture";
import { calcDeltaTime } from "./utils";

export class FluidSimulator {
  device!: GPUDevice;
  texture!: GPUTexture[];
  ctx!: GPUCanvasContext;
  pipelines!: IPipelines;
  renderPassDescriptor!: GPURenderPassDescriptor;
  sampler!: GPUSampler;
  uniforms!: {
    advect: IBuffer;
    diffuse: IBuffer;
    velocity: IBuffer;
    checkerboard: IBuffer;
    velocityField: IBuffer;
  };
  bindingGroups!: IBindingGroups;

  size = { width: 0, height: 0 };
  velocity!: VelocitField;
  dye!: IDoubleTexture;

  constructor() {}

  static async create(canvas: HTMLCanvasElement) {
    const sim = new FluidSimulator();
    await sim.createGPUContext(sim, canvas);
    await sim.createPipelines();

    sim.createUniforms();
    sim.createRenderPassDescriptor();
    sim.velocity = {
      textures: createDoubleTexture(sim.device),
      data: [0, 0],
    };
    sim.dye = createDoubleTexture(sim.device);
    sim.sampler = sim.device.createSampler();
    // sim.writeVelocityTexture();
    sim.createBindGroups();
    // mouseVelocityListener(sim.resetVelocity, sim.size).subscribe(({ position, velocity }) => {
    // });
    sim.writeTextures();
    sim.step(0);

    return sim;
  }

  step = (timestamp: number) => {
    const colorAttachments = this.renderPassDescriptor.colorAttachments as GPURenderPassColorAttachment[];
    colorAttachments[0].view = this.ctx.getCurrentTexture();

    const dt = calcDeltaTime();
    // this.velocityStep(dt);
    // this.diffuseStep(dt);
    // this.advectStep(dt);
    // this.drawCheckerboard();
    this.drawVelocity(timestamp);
    this.renderQuad();
    requestAnimationFrame(this.step);
  };

  drawVelocity(frame: number) {
    const device = this.device;
    const pipeline = this.pipelines.velocityVectorPipeline;
    const bindGroup = this.bindingGroups.velocityVectorsBindGroup;

    const uniform = this.uniforms.velocityField;
    device.queue.writeBuffer(uniform.buffer, 0, new Float32Array([this.size.width, this.size.height]));

    const encoder = device.createCommandEncoder({ label: "velocity vectors encoder" });

    const pass = encoder.beginRenderPass(this.renderPassDescriptor);

    pass.setPipeline(pipeline);
    pass.setBindGroup(0, bindGroup);
    pass.draw(6, config.TEXTURE_WIDTH * config.TEXTURE_HEIGHT);
    pass.end();

    const commandBuffer = encoder.finish();

    device.queue.submit([commandBuffer]);
  }

  drawCheckerboard() {
    const device = this.device;
    const pipeline = this.pipelines.checkerboardPipeline;
    const uniform = this.uniforms.checkerboard;
    const bindGroup = this.bindingGroups.checkerboardBindGroup;
    const cellWidth = this.size.width / config.TEXTURE_WIDTH;
    const cellHeight = this.size.height / config.TEXTURE_HEIGHT;
    uniform.view[0] = cellWidth;
    uniform.view[1] = cellHeight;

    device.queue.writeBuffer(uniform.buffer, 0, uniform.data);

    const renderEncoder = device.createCommandEncoder({ label: "CheckerBoard Encoder" });
    const renderPass = renderEncoder.beginRenderPass(this.renderPassDescriptor);

    renderPass.setPipeline(pipeline);
    renderPass.setBindGroup(0, bindGroup);
    renderPass.draw(6);
    renderPass.end();

    device.queue.submit([renderEncoder.finish()]);
  }

  velocityStep(dt: number) {
    this.diffVelocityStep(dt);
    this.projectVelocity();
    this.advectVelocityStep(dt);
  }

  projectVelocity() {
    const device = this.device;
    const pipeline = this.pipelines.projectPipeline;
    const bindGroup = this.bindingGroups.projectBindGroup;

    let encoder = device.createCommandEncoder({ label: "compute diffusion encoder" });
    let computePass = encoder.beginComputePass();

    computePass.setPipeline(pipeline);
    computePass.setBindGroup(0, bindGroup);
    computePass.dispatchWorkgroups(config.TEXTURE_WIDTH, config.TEXTURE_HEIGHT, 1);

    computePass.end();

    let commandBuffer = encoder.finish();

    device.queue.submit([commandBuffer]);

    this.velocity.textures.swap();
  }

  diffVelocityStep(dt: number) {
    const device = this.device;
    const pipeline = this.pipelines.velocityDiffusionPipeline;
    const uniform = this.uniforms.velocity;
    const bindGroup = this.bindingGroups.velocityDiffusionBindGroup;

    uniform.view[0] = config.VISCOSITY;
    uniform.view[1] = dt;
    device.queue.writeBuffer(uniform.buffer, 0, uniform.data);

    let encoder = device.createCommandEncoder({ label: "compute diffusion encoder" });
    let computePass = encoder.beginComputePass();

    computePass.setPipeline(pipeline);
    computePass.setBindGroup(0, bindGroup);
    computePass.dispatchWorkgroups(config.TEXTURE_WIDTH, config.TEXTURE_HEIGHT, 1);

    computePass.end();

    let commandBuffer = encoder.finish();

    device.queue.submit([commandBuffer]);

    this.velocity.textures.swap();
  }

  advectVelocityStep(dt: number) {
    const device = this.device;
    const advPipeline = this.pipelines.velocityAdvectPipeline;
    const bindGroup = this.bindingGroups.velocityAdvectBindGroup;

    const encoder = device.createCommandEncoder({ label: "compute diffusion encoder" });
    const computePass = encoder.beginComputePass();

    computePass.setPipeline(advPipeline);
    computePass.setBindGroup(0, bindGroup);
    computePass.dispatchWorkgroups(config.TEXTURE_WIDTH, config.TEXTURE_HEIGHT, 1);

    computePass.end();

    const commandBuffer = encoder.finish();

    device.queue.submit([commandBuffer]);

    this.velocity.textures.swap();
  }

  projectStep(dt: number) {}

  advectStep(dt: number) {
    const device = this.device;
    const pipeline = this.pipelines.advectPipeline;
    const bindGroup = this.bindingGroups.advectBindGroup;
    const uniform = this.uniforms.advect;

    uniform.view[0] = dt;
    device.queue.writeBuffer(uniform.buffer, 0, uniform.data);

    const encoder = device.createCommandEncoder({ label: "compute diffusion encoder" });
    const computePass = encoder.beginComputePass();

    computePass.setPipeline(pipeline);
    computePass.setBindGroup(0, bindGroup);
    computePass.dispatchWorkgroups(config.TEXTURE_WIDTH, config.TEXTURE_HEIGHT, 1);

    computePass.end();

    const commandBuffer = encoder.finish();

    device.queue.submit([commandBuffer]);
    this.dye.swap();
  }

  diffuseStep(dt: number) {
    const device = this.device;
    const pipeline = this.pipelines.diffusionPipeline;
    const uniform = this.uniforms.diffuse;
    const bindGroup = this.bindingGroups.diffusionBindGroup;

    uniform.view[0] = config.DIFFUSION;
    uniform.view[1] = dt;
    device.queue.writeBuffer(uniform.buffer, 0, uniform.data);

    for (let i = 0; i < 20; i++) {
      const encoder = device.createCommandEncoder({ label: "compute diffusion encoder" });
      const computePass = encoder.beginComputePass();

      computePass.setPipeline(pipeline);
      computePass.setBindGroup(0, bindGroup);
      computePass.dispatchWorkgroups(config.TEXTURE_WIDTH, config.TEXTURE_HEIGHT, 1);
      computePass.end();

      const commandBuffer = encoder.finish();

      device.queue.submit([commandBuffer]);
    }

    this.dye.swap();
  }

  renderQuad() {
    const device = this.device;
    const pipeline = this.pipelines.basePipeline;
    const bindGroup = this.bindingGroups.baseBindGroup;

    const renderEncoder = device.createCommandEncoder({ label: "Render Encoder" });

    const renderPass = renderEncoder.beginRenderPass(this.renderPassDescriptor);

    renderPass.setPipeline(pipeline);
    renderPass.setBindGroup(0, bindGroup);
    renderPass.draw(6);
    renderPass.end();

    device.queue.submit([renderEncoder.finish()]);
  }

  createUniforms() {
    this.uniforms = {
      advect: this.createUniformBuffer("advect uniform buffer", 2 * 4),
      diffuse: this.createUniformBuffer("diffusion uniform buffer", 2 * 4),
      velocity: this.createUniformBuffer("velocity uniform buffer", 2 * 4),
      velocityField: this.createUniformBuffer("velocity field uniform buffer", 2 * 4),
      checkerboard: this.createUniformBuffer("checkerboard uniform buffer", 2 * 4),
    };
  }

  createBindGroups() {
    const uniforms = this.uniforms;
    const pipelines = this.pipelines;
    const device = this.device;

    const checkerboardBindGroup = device.createBindGroup({
      label: "checkerboard binding group",
      layout: pipelines.checkerboardPipeline.getBindGroupLayout(0),
      entries: [{ binding: 0, resource: uniforms.checkerboard.buffer }],
    });
    const projectBindGroup = device.createBindGroup({
      label: "project bind group",
      layout: pipelines.projectPipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: this.velocity.textures.tex1 },
        { binding: 1, resource: this.velocity.textures.tex2 },
      ],
    });
    const advectBindGroup = device.createBindGroup({
      label: "advect bind group",
      layout: pipelines.advectPipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: this.dye.tex1 },
        { binding: 1, resource: this.dye.tex2 },
        { binding: 2, resource: this.velocity.textures.tex1 },
        { binding: 3, resource: uniforms.advect.buffer },
      ],
    });
    const velocityDiffusionBindGroup = device.createBindGroup({
      label: "velocity bind group",
      layout: pipelines.velocityDiffusionPipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: this.velocity.textures.tex1 },
        { binding: 1, resource: this.velocity.textures.tex2 },
        { binding: 2, resource: uniforms.velocity.buffer },
      ],
    });

    const diffusionBindGroup = device.createBindGroup({
      label: "diffusion bind group",
      layout: pipelines.diffusionPipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: this.dye.tex1 },
        { binding: 1, resource: this.dye.tex2 },
        { binding: 2, resource: uniforms.diffuse.buffer },
      ],
    });
    const baseBindGroup = device.createBindGroup({
      label: "display Bind group",
      layout: pipelines.basePipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: this.sampler },
        { binding: 1, resource: this.dye.tex1 },
      ],
    });
    const velocityAdvectBindGroup = device.createBindGroup({
      label: "velocity bind group",
      layout: pipelines.velocityAdvectPipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: this.velocity.textures.tex1 },
        { binding: 1, resource: this.velocity.textures.tex2 },
        { binding: 2, resource: uniforms.velocity.buffer },
      ],
    });
    const velocityVectorsBindGroup = device.createBindGroup({
      label: "Velocity vectors bind group",
      layout: pipelines.velocityVectorPipeline.getBindGroupLayout(0),
      entries: [
        {
          binding: 0,
          resource: this.velocity.textures.tex1,
        },
        {
          binding: 1,
          resource: this.uniforms.velocityField.buffer,
        },
      ],
    });

    this.bindingGroups = {
      checkerboardBindGroup,
      projectBindGroup,
      velocityDiffusionBindGroup,
      advectBindGroup,
      diffusionBindGroup,
      baseBindGroup,
      velocityAdvectBindGroup,
      velocityVectorsBindGroup,
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

  writeTextures() {
    const w = config.TEXTURE_WIDTH;
    const h = config.TEXTURE_HEIGHT;
    const dyeData = initTextureData(w, h);
    const velocityData = initVelocityData(w, h);

    this.writeTexture(dyeData, this.dye.tex1, w, h);
    this.writeTexture(velocityData, this.velocity.textures.tex1, w, h);
  }

  writeTexture(data: number[][], texture: GPUTexture, w: number, h: number) {
    const textureData = new Uint8Array(data.flat());
    this.device.queue.writeTexture({ texture }, textureData, { bytesPerRow: w * 4 }, { width: w, height: h });
  }

  createRenderPassDescriptor() {
    const renderPassDescriptor: GPURenderPassDescriptor = {
      label: "my render pass descriptor",
      colorAttachments: [
        {
          view: this.ctx.getCurrentTexture().createView(),
          loadOp: "load",
          storeOp: "store",
        },
      ],
    };
    this.renderPassDescriptor = renderPassDescriptor;
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
