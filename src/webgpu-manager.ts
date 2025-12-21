import shaderModule from "./shaders/module.wgsl"

export class WebGPUManager {
  public canvas!: HTMLCanvasElement;
  public ctx!: GPUCanvasContext;
  public device!: GPUDevice
  public pipeline!: GPURenderPipeline
  public renderPassDescriptor!: GPURenderPassDescriptor;

  init() {
    this.initCanvas();
    this.initWebGPU();
  }

  private resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }


  private async initWebGPU() {
    const adapter = await navigator.gpu?.requestAdapter();
    const device = await adapter?.requestDevice();
    if (!device) {
      throw new Error('need a browser that supports WebGPU');
    }
    this.device = device;

    const canvas = this.canvas
    const ctx = canvas.getContext('webgpu');
    if (!ctx) {
      throw new Error("WebGPU context init failed!")
    }

    this.ctx = ctx;

    const presentationFormat = navigator.gpu.getPreferredCanvasFormat();
    ctx?.configure({
      device,
      format: presentationFormat
    })

    const module = this.device.createShaderModule({
      label: "my shader module",
      code: shaderModule
    })

    const pipeline = this.device.createRenderPipeline({
      label: "my pipeline",
      layout: "auto",
      vertex: {
        module
      },
      fragment: {
        module,
        targets: [{ format: presentationFormat }]
      }
    })



    const renderPassDescriptor: GPURenderPassDescriptor = {
      label: 'our basic canvas renderPass',
      colorAttachments: [
        {
          view: this.ctx.getCurrentTexture().createView(),
          clearValue: [0.3, 0.3, 0.3, 1],
          loadOp: 'clear',
          storeOp: 'store',
        },
      ],
    };

    this.renderPassDescriptor = renderPassDescriptor;

    this.pipeline = pipeline;

    this.render();
  }

  private initCanvas() {
    const canvas = document.querySelector('canvas');
    if (!canvas) {
      throw new Error("Canvas init failed!")
    }
    this.canvas = canvas
    this.resize()
    window.addEventListener('resize', this.onResize)
  }

  private render() {

    const encoder = this.device.createCommandEncoder({
      label: "My encoder"
    })

    const pass = encoder.beginRenderPass(this.renderPassDescriptor);

    pass.setPipeline(this.pipeline);
    pass.draw(3)
    pass.end()

    const commandBuffer = encoder.finish();

    this.device.queue.submit([commandBuffer])

  }

  onResize = () => {
    this.resize()
  }

}