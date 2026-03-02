import baseModule from "./shaders/base.wgsl";
import velocityModule from "./shaders/velocity.wgsl";
import diffustionModule from "./shaders/diffusion.wgsl";
import advectModule from "./shaders/advect.wgsl";

export interface IPipelines {
  basePipeline: GPURenderPipeline;
  velocityPipeline: GPUComputePipeline;
  diffusionPipeline: GPUComputePipeline;
  advectPipeline: GPUComputePipeline;
}

export async function createBasePipeline(device: GPUDevice) {
  const presentationFormat = navigator.gpu.getPreferredCanvasFormat();
  const module = device.createShaderModule({
    label: "Display module",
    code: baseModule,
  });

  const descriptor: GPURenderPipelineDescriptor = {
    layout: "auto",
    vertex: {
      module,
    },
    fragment: {
      module,
      targets: [{ format: presentationFormat }],
    },
  };
  const pipeline = device.createRenderPipelineAsync(descriptor);
  return pipeline;
}

export async function createVelocityPipeline(device: GPUDevice) {
  const module = device.createShaderModule({
    label: "Velocity Module",
    code: velocityModule,
  });

  const descriptor: GPUComputePipelineDescriptor = {
    layout: "auto",
    compute: {
      module,
    },
  };

  const pipeline = device.createComputePipelineAsync(descriptor);
  return pipeline;
}

export async function createAdvectPipeline(device: GPUDevice) {
  const module = device.createShaderModule({
    label: "Advect pipeline",
    code: advectModule,
  });

  const descriptor: GPUComputePipelineDescriptor = {
    layout: "auto",
    compute: {
      module,
    },
  };

  const pipeline = device.createComputePipelineAsync(descriptor);
  return pipeline;
}

export async function createDiffusionPipeline(device: GPUDevice) {
  const module = device.createShaderModule({
    label: "Diffusion pipeline",
    code: diffustionModule,
  });

  const descriptor: GPUComputePipelineDescriptor = {
    layout: "auto",
    compute: {
      module,
    },
  };

  const pipeline = device.createComputePipelineAsync(descriptor);
  return pipeline;
}

export async function createPipelines(device: GPUDevice): Promise<IPipelines> {
  const basePipeline = await createBasePipeline(device);
  const velocityPipeline = await createVelocityPipeline(device);
  const diffusionPipeline = await createDiffusionPipeline(device);
  const advectPipeline = await createAdvectPipeline(device);
  return { basePipeline, velocityPipeline, diffusionPipeline, advectPipeline };
}
