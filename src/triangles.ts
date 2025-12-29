import shaderModule from "./shaders/module.wgsl"



interface IPipeline {
  pipelines?: GPURenderPipeline[],
  depthTextures?: GPUTexture[],
  vertexBuffers?: GPUBuffer[],
  uniformBuffers?: GPUBuffer[],
  uniformBindGroups?: GPUBindGroup[],
}


const createPipeline = async (device: GPUDevice) => {
  const presentationFormat = navigator.gpu.getPreferredCanvasFormat();
  const module = device.createShaderModule({
    label: "my module",
    code: shaderModule
  });

  const descriptor: GPURenderPipelineDescriptor = {
    layout: 'auto',
    vertex: {
      module,
      buffers: [
        {
          arrayStride: 2 * 4,
          attributes: [
            {
              shaderLocation: 0,
              format: "float32x2",
              offset: 0
            }
          ]
        }
      ]
    },
    fragment: {
      module,
      targets: [{ format: presentationFormat }]
    }
  }


  const pipeline = device.createRenderPipelineAsync(descriptor);

  return pipeline
}

export async function run() {
  const canvas = document.querySelector('#webgpu-canvas') as HTMLCanvasElement;
  canvas.width = canvas.clientWidth * devicePixelRatio;
  canvas.height = canvas.clientHeight * devicePixelRatio;

  const size = { width: canvas.width, height: canvas.height }

  const adapter = await navigator.gpu.requestAdapter();
  const device = await adapter?.requestDevice();
  const context = canvas.getContext('webgpu') as GPUCanvasContext;

  if (!device) {
    throw new Error("Device not initialized!")
  }

  context.configure({
    device: device,
    format: navigator.gpu.getPreferredCanvasFormat()
  })

  // const data = getData()
  const p = await createPipeline(device);
  console.log(p);


}