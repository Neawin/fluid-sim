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
      buffers: [{
        arrayStride: 2 * 4,
        attributes: [
          { shaderLocation: 0, offset: 0, format: 'float32x2' }
        ]
      }]
    },
    fragment: {
      module,
      targets: [{ format: presentationFormat }]
    }
  }
  const pipeline = device.createRenderPipelineAsync(descriptor);
  return pipeline
}


