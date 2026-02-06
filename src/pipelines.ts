import displayModule from "./shaders/display.wgsl"

export async function createDisplayPipeline(device: GPUDevice) {
  const presentationFormat = navigator.gpu.getPreferredCanvasFormat();
  const module = device.createShaderModule({
    label: "my module",
    code: displayModule
  });

  const descriptor: GPURenderPipelineDescriptor = {
    layout: 'auto',
    vertex: {
      module,
    },
    fragment: {
      module,
      targets: [{ format: presentationFormat }]
    }
  }
  const pipeline = device.createRenderPipelineAsync(descriptor);
  return pipeline
}


