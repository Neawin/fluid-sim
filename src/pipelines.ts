import displayModule from "./shaders/display.wgsl";
import velocityModule from "./shaders/velocity.wgsl";
import diffustionModule from "./shaders/diffusion.wgsl";

export interface IPipelines {
  displayPipeline: GPURenderPipeline;
  velocityPipeline: GPUComputePipeline;
  diffusionPipeline: GPUComputePipeline;
}

export async function createDisplayPipeline(device: GPUDevice) {
  const presentationFormat = navigator.gpu.getPreferredCanvasFormat();
  const module = device.createShaderModule({
    label: "Display module",
    code: displayModule,
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

export async function createDiffustionPipeline(device: GPUDevice) {
  const module = device.createShaderModule({
    label: "Diffustion pipeline",
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
  const displayPipeline = await createDisplayPipeline(device);
  const velocityPipeline = await createVelocityPipeline(device);
  const diffusionPipeline = await createDiffustionPipeline(device);
  return { displayPipeline, velocityPipeline, diffusionPipeline };
}
