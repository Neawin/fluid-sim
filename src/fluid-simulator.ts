import { config } from "./config";
import type { IBuffer, IDoubleTexture, VelocityField } from "./models";
import { mouseVelocityListener } from "./mouse";
import { createPipelines, type IPipelines } from "./pipelines";
import { createDoubleTexture, initProjectData, initTextureData, initVelocityData } from "./texture";
import { calcDeltaTime } from "./utils";
import * as dat from "dat.gui";

export class FluidSimulator {
  device!: GPUDevice;
  texture!: GPUTexture[];
  ctx!: GPUCanvasContext;
  pipelines!: IPipelines;
  renderPassDescriptor!: GPURenderPassDescriptor;
  streamer!: any;
  sampler!: GPUSampler;
  config = config;
  uniforms!: {
    advect: IBuffer;
    diffuse: IBuffer;
    velocity: IBuffer;
    mousePos: IBuffer;
    checkerboard: IBuffer;
    velocityField: IBuffer;
    density: IBuffer;
  };

  lastTime = 0;
  fps = 1000 / 144;

  mouseDown = false;
  mouse = {
    position: [0, 0],
    velocity: [0, 0],
  };
  size = { width: 0, height: 0 };
  velocity!: VelocityField;
  dye!: IDoubleTexture;
  project!: IDoubleTexture;

  constructor() {}

  static async create(canvas: HTMLCanvasElement) {
    const sim = new FluidSimulator();
    await sim.createGPUContext(sim, canvas);
    await sim.createPipelines();

    sim.createUniforms();
    sim.createRenderPassDescriptor();
    sim.velocity = {
      textures: createDoubleTexture(sim.device, "rgba8snorm"),
      data: [0, 0],
    };
    sim.dye = createDoubleTexture(sim.device, "rgba8unorm");
    sim.project = createDoubleTexture(sim.device, "rgba8snorm");
    sim.sampler = sim.device.createSampler();
    mouseVelocityListener(sim.reset, sim.size).subscribe(({ position, velocity }) => {
      sim.velocity.data = velocity;
      sim.mouse = {
        position,
        velocity,
      };
      sim.mouseDown = true;
    });
    sim.writeTextures();
    requestAnimationFrame(sim.step);

    const gui = new dat.GUI();

    gui.add(sim.config, "GRID_SIM", [32, 64, 128, 256, 512]).onChange(() => {
      sim.velocity = {
        textures: createDoubleTexture(sim.device, "rgba8snorm"),
        data: [0, 0],
      };
      sim.dye = createDoubleTexture(sim.device, "rgba8unorm");
      sim.project = createDoubleTexture(sim.device, "rgba8snorm");
      sim.writeTextures();
    });
    gui.add(sim.config, "DIFFUSION", 0);
    gui.add(sim.config, "VISCOSITY", 0);
    gui.add(sim.config, "RADIUS", 1);
    const container = document.querySelector(".container");
    container?.appendChild(gui.domElement);
    gui.domElement.classList.add("gui");
    return sim;
  }
  // step = (now: number) => {
  //   requestAnimationFrame(this.step);

  //   const elapsed = now - this.lastTime;
  //   if (elapsed < this.fps) {
  //     return;
  //   }
  //   this.lastTime = now - (elapsed % this.fps);

  //   const colorAttachments = this.renderPassDescriptor.colorAttachments as GPURenderPassColorAttachment[];
  //   colorAttachments[0].view = this.ctx.getCurrentTexture().createView();

  //   const dt = this.fps / 1000;
  //   this.densityStep(dt);
  //   this.velocityStep(dt);
  //   this.renderQuad();
  // };

  step = () => {
    const colorAttachments = this.renderPassDescriptor.colorAttachments as GPURenderPassColorAttachment[];
    colorAttachments[0].view = this.ctx.getCurrentTexture();

    // this.drawCheckerboard();
    this.drawVelocity();
    const dt = calcDeltaTime();
    this.densityStep(dt);
    this.velocityStep(dt);
    this.renderQuad();
    requestAnimationFrame(this.step);
  };

  densityStep(dt: number) {
    if (this.mouseDown) {
      this.addDensity();
    }
    this.dye.swap();
    this.diffuseStep(dt);
    this.dye.swap();
    this.advectStep(dt);
  }

  velocityStep(dt: number) {
    this.addVelocity();
    this.velocity.textures.swap();
    this.diffVelocityStep(dt);
    this.velocity.textures.swap();
    this.projectVelocity();
    this.velocity.textures.swap();
    this.advectVelocityStep(dt);
    this.projectVelocity();
  }

  addDensity() {
    const device = this.device;
    const pipeline = this.pipelines.densityPipeline;
    const uniform = this.uniforms.density;
    const mousePos = this.mouse.position;

    uniform.view[0] = mousePos[0];
    uniform.view[1] = mousePos[1];
    uniform.view[2] = this.config.RADIUS;

    this.device.queue.writeBuffer(uniform.buffer, 0, uniform.data);
    const bindGroup = device.createBindGroup({
      label: "density bind Group",
      layout: this.pipelines.densityPipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: this.dye.tex1 },
        { binding: 1, resource: this.dye.tex2 },
        { binding: 2, resource: uniform.buffer },
      ],
    });

    let encoder = device.createCommandEncoder({ label: "compute density encoder" });
    let computePass = encoder.beginComputePass();

    computePass.setPipeline(pipeline);
    computePass.setBindGroup(0, bindGroup);
    computePass.dispatchWorkgroups(this.config.GRID_SIM, this.config.GRID_SIM, 1);
    computePass.end();

    let commandBuffer = encoder.finish();

    device.queue.submit([commandBuffer]);
  }

  diffuseStep(dt: number) {
    const device = this.device;
    const pipeline = this.pipelines.diffusionPipeline;
    const uniform = this.uniforms.diffuse;

    uniform.view[0] = this.config.DIFFUSION;
    uniform.view[1] = dt;
    device.queue.writeBuffer(uniform.buffer, 0, uniform.data);

    const bindGroup = this.device.createBindGroup({
      label: "diffuse step bind group",
      layout: this.pipelines.diffusionPipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: this.dye.tex1 },
        { binding: 1, resource: this.dye.tex2 },
        { binding: 2, resource: uniform.buffer },
      ],
    });

    const encoder = device.createCommandEncoder({ label: "compute diffusion encoder" });
    const computePass = encoder.beginComputePass();

    computePass.setPipeline(pipeline);
    computePass.setBindGroup(0, bindGroup);
    computePass.dispatchWorkgroups(this.config.GRID_SIM, this.config.GRID_SIM, 1);
    computePass.end();

    const commandBuffer = encoder.finish();

    device.queue.submit([commandBuffer]);
  }

  drawVelocity() {
    const device = this.device;
    const pipeline = this.pipelines.velocityVectorPipeline;

    const uniform = this.uniforms.velocityField;
    device.queue.writeBuffer(uniform.buffer, 0, new Float32Array([this.size.width, this.size.height]));

    const bindGroup = this.device.createBindGroup({
      label: "velocity vectors bind group",
      layout: pipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: this.velocity.textures.tex1 },
        { binding: 1, resource: uniform.buffer },
      ],
    });

    const encoder = device.createCommandEncoder({ label: "velocity vectors encoder" });

    const pass = encoder.beginRenderPass(this.renderPassDescriptor);

    pass.setPipeline(pipeline);
    pass.setBindGroup(0, bindGroup);
    pass.draw(6, this.config.GRID_SIM * this.config.GRID_SIM);
    pass.end();

    const commandBuffer = encoder.finish();

    device.queue.submit([commandBuffer]);
  }

  drawCheckerboard() {
    const device = this.device;
    const pipeline = this.pipelines.checkerboardPipeline;
    const uniform = this.uniforms.checkerboard;
    const bindGroup = this.device.createBindGroup({
      label: "checkerboard bind group",
      layout: pipeline.getBindGroupLayout(0),
      entries: [{ binding: 0, resource: uniform.buffer }],
    });
    const cellWidth = this.size.width / this.config.GRID_SIM;
    const cellHeight = this.size.height / this.config.GRID_SIM;
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

  addVelocity() {
    const device = this.device;
    const pipeline = this.pipelines.velocityPipeline;
    const uniform = this.uniforms.mousePos;
    const mouseVelocity = this.mouse.velocity;
    const mousePos = this.mouse.position;

    uniform.view[0] = mouseVelocity[0];
    uniform.view[1] = mouseVelocity[1];
    uniform.view[2] = mousePos[0];
    uniform.view[3] = mousePos[1];
    uniform.view[4] = this.config.RADIUS;
    device.queue.writeBuffer(uniform.buffer, 0, uniform.data);

    const bindGroup = device.createBindGroup({
      label: "add velocity bindgroup",
      layout: pipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: this.velocity.textures.tex1 },
        { binding: 1, resource: this.velocity.textures.tex2 },
        { binding: 2, resource: uniform.buffer },
      ],
    });

    let encoder = device.createCommandEncoder({ label: "compute velocity encoder" });
    let computePass = encoder.beginComputePass();

    computePass.setPipeline(pipeline);
    computePass.setBindGroup(0, bindGroup);
    computePass.dispatchWorkgroups(this.config.GRID_SIM, this.config.GRID_SIM, 1);

    computePass.end();

    let commandBuffer = encoder.finish();

    device.queue.submit([commandBuffer]);
  }

  projectVelocity() {
    this.projectDivergence();
    this.projectJacobi();
    this.projectPressure();
  }

  projectDivergence() {
    const device = this.device;
    const pipeline = this.pipelines.projectDivPipeline;

    const bindGroup = device.createBindGroup({
      label: "project bind group",
      layout: pipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: this.velocity.textures.tex1 },
        { binding: 1, resource: this.project.tex1 },
      ],
    });

    let encoder = device.createCommandEncoder({ label: "compute diffusion encoder" });
    let computePass = encoder.beginComputePass();

    computePass.setPipeline(pipeline);
    computePass.setBindGroup(0, bindGroup);
    computePass.dispatchWorkgroups(this.config.GRID_SIM, this.config.GRID_SIM, 1);

    computePass.end();

    let commandBuffer = encoder.finish();

    device.queue.submit([commandBuffer]);
  }
  projectJacobi() {
    const device = this.device;
    const pipeline = this.pipelines.projectJacobiPipeline;

    for (let i = 0; i < 20; i++) {
      const bindGroup = device.createBindGroup({
        label: "project jacobi bind group",
        layout: pipeline.getBindGroupLayout(0),
        entries: [
          { binding: 0, resource: this.project.tex1 },
          { binding: 1, resource: this.project.tex2 },
        ],
      });

      let encoder = device.createCommandEncoder({ label: "compute diffusion encoder" });
      let computePass = encoder.beginComputePass();

      computePass.setPipeline(pipeline);
      computePass.setBindGroup(0, bindGroup);
      computePass.dispatchWorkgroups(this.config.GRID_SIM, this.config.GRID_SIM, 1);

      computePass.end();

      let commandBuffer = encoder.finish();

      device.queue.submit([commandBuffer]);
      this.project.swap();
    }
  }

  projectPressure() {
    const device = this.device;
    const pipeline = this.pipelines.projectPressurePipeline;
    const bindGroup = device.createBindGroup({
      label: "project pressure bind group",
      layout: pipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: this.velocity.textures.tex1 },
        { binding: 1, resource: this.velocity.textures.tex2 },
        { binding: 2, resource: this.project.tex1 },
      ],
    });

    let encoder = device.createCommandEncoder({ label: "compute diffusion encoder" });
    let computePass = encoder.beginComputePass();

    computePass.setPipeline(pipeline);
    computePass.setBindGroup(0, bindGroup);
    computePass.dispatchWorkgroups(this.config.GRID_SIM, this.config.GRID_SIM, 1);

    computePass.end();

    let commandBuffer = encoder.finish();

    device.queue.submit([commandBuffer]);
  }

  diffVelocityStep(dt: number) {
    const device = this.device;
    const pipeline = this.pipelines.velocityDiffusionPipeline;
    const uniform = this.uniforms.velocity;

    uniform.view[0] = this.config.VISCOSITY;
    uniform.view[1] = dt;
    device.queue.writeBuffer(uniform.buffer, 0, uniform.data);

    const bindGroup = device.createBindGroup({
      label: "diffuse velocity bindgroup",
      layout: pipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: this.velocity.textures.tex1 },
        { binding: 1, resource: this.velocity.textures.tex2 },
        { binding: 2, resource: uniform.buffer },
      ],
    });

    let encoder = device.createCommandEncoder({ label: "compute diffusion encoder" });
    let computePass = encoder.beginComputePass();

    computePass.setPipeline(pipeline);
    computePass.setBindGroup(0, bindGroup);
    computePass.dispatchWorkgroups(this.config.GRID_SIM, this.config.GRID_SIM, 1);

    computePass.end();

    let commandBuffer = encoder.finish();

    device.queue.submit([commandBuffer]);
  }

  advectVelocityStep(dt: number) {
    const device = this.device;
    const pipeline = this.pipelines.velocityAdvectPipeline;
    const uniform = this.uniforms.density;

    uniform.view[0] = this.config.DIFFUSION;
    uniform.view[1] = dt;

    device.queue.writeBuffer(uniform.buffer, 0, uniform.data);

    const bindGroup = device.createBindGroup({
      label: "velocity advect bind broup",
      layout: pipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: this.velocity.textures.tex1 },
        { binding: 1, resource: this.velocity.textures.tex2 },
        { binding: 2, resource: uniform.buffer },
      ],
    });

    const encoder = device.createCommandEncoder({ label: "compute diffusion encoder" });
    const computePass = encoder.beginComputePass();

    computePass.setPipeline(pipeline);
    computePass.setBindGroup(0, bindGroup);
    computePass.dispatchWorkgroups(this.config.GRID_SIM, this.config.GRID_SIM, 1);

    computePass.end();

    const commandBuffer = encoder.finish();

    device.queue.submit([commandBuffer]);

    this.velocity.textures.swap();
  }

  advectStep(dt: number) {
    const device = this.device;
    const pipeline = this.pipelines.advectPipeline;
    const uniform = this.uniforms.advect;

    uniform.view[0] = dt;
    device.queue.writeBuffer(uniform.buffer, 0, uniform.data);

    for (let i = 0; i < 20; i++) {
      const bindGroup = this.device.createBindGroup({
        label: "advect bind group",
        layout: pipeline.getBindGroupLayout(0),
        entries: [
          { binding: 0, resource: this.dye.tex1 },
          { binding: 1, resource: this.dye.tex2 },
          { binding: 2, resource: this.velocity.textures.tex1 },
          { binding: 3, resource: uniform.buffer },
        ],
      });

      const encoder = device.createCommandEncoder({ label: "compute diffusion encoder" });
      const computePass = encoder.beginComputePass();

      computePass.setPipeline(pipeline);
      computePass.setBindGroup(0, bindGroup);
      computePass.dispatchWorkgroups(this.config.GRID_SIM, this.config.GRID_SIM, 1);

      computePass.end();

      const commandBuffer = encoder.finish();

      device.queue.submit([commandBuffer]);
    }
  }

  renderQuad() {
    const device = this.device;
    const pipeline = this.pipelines.basePipeline;
    const bindGroup = this.device.createBindGroup({
      layout: this.pipelines.basePipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: this.sampler },
        { binding: 1, resource: this.dye.tex1 },
      ],
    });

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
      density: this.createUniformBuffer("density uniform buffer", 4 * 4),
      velocity: this.createUniformBuffer("velocity uniform buffer", 2 * 4),
      velocityField: this.createUniformBuffer("velocity field uniform buffer", 2 * 4),
      checkerboard: this.createUniformBuffer("checkerboard uniform buffer", 2 * 4),
      mousePos: this.createUniformBuffer("mouse pos uniform buffer", 6 * 4),
    };
  }

  writeVelocityTexture() {
    const w = this.config.GRID_SIM;
    const h = this.config.GRID_SIM;
    const device = this.device;

    const { tex1 } = this.velocity.textures;
    const data = initVelocityData(w, h);
    const view = new Float32Array(data.flat());

    device.queue.writeTexture({ texture: tex1 }, view, { bytesPerRow: w * 4 }, { width: w, height: h });
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
    const w = this.config.GRID_SIM;
    const h = this.config.GRID_SIM;
    const dyeData = initTextureData(w, h);
    const velocityData = initVelocityData(w, h);
    const projectData = initProjectData(w, h);

    this.writeTexture(dyeData, this.dye.tex1, w, h);
    this.writeTexture(dyeData, this.dye.tex2, w, h);
    this.writeTexture(projectData, this.project.tex1, w, h);
    this.writeTexture(projectData, this.project.tex2, w, h);
    this.writeTexture(velocityData, this.velocity.textures.tex1, w, h);
    this.writeTexture(velocityData, this.velocity.textures.tex2, w, h);
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

  private reset = () => {
    this.velocity.data = [0, 0];
    // this.mouse.velocity = [0, 0];
    this.mouseDown = false;
  };
}
