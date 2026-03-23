import baseModule from "./shaders/base.wgsl";
import diffusionModule from "./shaders/diffusion.wgsl";
import advectModule from "./shaders/advect.wgsl";
import velocityAdvectModule from "./shaders/velocity-advect.wgsl";
import velocityDiffusionModule from "./shaders/velocity-diffusion.wgsl";
import projectModule from "./shaders/project.wgsl";
import checkerBoardModule from "./shaders/checkerboard.wgsl";
import velocityVectorModule from "./shaders/draw-velocity.wgsl";
import densityModule from "./shaders/add-density.wgsl";

export interface IPipelines {
  basePipeline: GPURenderPipeline;
  checkerboardPipeline: GPURenderPipeline;
  diffusionPipeline: GPUComputePipeline;
  advectPipeline: GPUComputePipeline;
  velocityAdvectPipeline: GPUComputePipeline;
  velocityDiffusionPipeline: GPUComputePipeline;
  projectPipeline: GPUComputePipeline;
  velocityVectorPipeline: GPURenderPipeline;
  densityPipeline: GPUComputePipeline;
}

export async function createVelocityVectorPipeline(device: GPUDevice) {
  const presentationFormat = navigator.gpu.getPreferredCanvasFormat();
  const module = device.createShaderModule({
    label: "velocity vector module",
    code: velocityVectorModule,
  });

  const descriptor: GPURenderPipelineDescriptor = {
    layout: "auto",
    vertex: {
      module,
    },
    fragment: {
      module,
      targets: [
        {
          format: presentationFormat,
          blend: {
            color: {
              srcFactor: "src-alpha",
              dstFactor: "one-minus-src-alpha",
              operation: "add",
            },
            alpha: {
              srcFactor: "one",
              dstFactor: "one-minus-src-alpha",
              operation: "add",
            },
          },
        },
      ],
    },
  };

  const pipeline = await device.createRenderPipelineAsync(descriptor);
  return pipeline;
}

export async function createCheckerboardPipeline(device: GPUDevice) {
  const presentationFormat = navigator.gpu.getPreferredCanvasFormat();
  const module = device.createShaderModule({
    label: "Checkerboard module",
    code: checkerBoardModule,
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
  const pipeline = await device.createRenderPipelineAsync(descriptor);
  return pipeline;
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
      targets: [
        {
          format: presentationFormat,
          blend: {
            color: {
              srcFactor: "src-alpha",
              dstFactor: "one-minus-src-alpha",
              operation: "add",
            },
            alpha: {
              srcFactor: "one",
              dstFactor: "one-minus-src-alpha",
              operation: "add",
            },
          },
        },
      ],
    },
  };
  const pipeline = await device.createRenderPipelineAsync(descriptor);
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

  const pipeline = await device.createComputePipelineAsync(descriptor);
  return pipeline;
}

export async function createVelocityAdvectPipeline(device: GPUDevice) {
  const module = device.createShaderModule({
    label: "Velocity advect pipeline",
    code: velocityAdvectModule,
  });

  const descriptor: GPUComputePipelineDescriptor = {
    layout: "auto",
    compute: {
      module,
    },
  };

  const pipeline = await device.createComputePipelineAsync(descriptor);
  return pipeline;
}
export async function createVelocityDiffusionPipeline(device: GPUDevice) {
  const module = device.createShaderModule({
    label: "Velocity diffusion pipeline",
    code: velocityDiffusionModule,
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
export async function createProjectPipeline(device: GPUDevice) {
  const module = device.createShaderModule({
    label: "project pipeline",
    code: projectModule,
  });

  const descriptor: GPUComputePipelineDescriptor = {
    layout: "auto",
    compute: {
      module,
    },
  };

  const pipeline = await device.createComputePipelineAsync(descriptor);
  return pipeline;
}

export async function createDensityPipeline(device: GPUDevice) {
  const module = device.createShaderModule({
    label: "Add Density pipeline",
    code: densityModule,
  });

  const descriptor: GPUComputePipelineDescriptor = {
    layout: "auto",
    compute: {
      module,
    },
  };

  const pipeline = await device.createComputePipelineAsync(descriptor);
  return pipeline;
}

export async function createDiffusionPipeline(device: GPUDevice) {
  const module = device.createShaderModule({
    label: "Diffusion pipeline",
    code: diffusionModule,
  });

  const descriptor: GPUComputePipelineDescriptor = {
    layout: "auto",
    compute: {
      module,
    },
  };

  const pipeline = await device.createComputePipelineAsync(descriptor);
  return pipeline;
}

export async function createPipelines(device: GPUDevice): Promise<IPipelines> {
  const basePipeline = await createBasePipeline(device);
  const diffusionPipeline = await createDiffusionPipeline(device);
  const advectPipeline = await createAdvectPipeline(device);
  const velocityAdvectPipeline = await createVelocityAdvectPipeline(device);
  const velocityDiffusionPipeline = await createVelocityDiffusionPipeline(device);
  const projectPipeline = await createProjectPipeline(device);
  const checkerboardPipeline = await createCheckerboardPipeline(device);
  const velocityVectorPipeline = await createVelocityVectorPipeline(device);
  const densityPipeline = await createDensityPipeline(device);
  return {
    basePipeline,
    diffusionPipeline,
    advectPipeline,
    velocityAdvectPipeline,
    velocityDiffusionPipeline,
    projectPipeline,
    checkerboardPipeline,
    velocityVectorPipeline,
    densityPipeline,
  };
}
