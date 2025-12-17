import shaderModule from "./shaders/module.wgsl"

export class CanvasManager {
  public canvas!: HTMLCanvasElement;
  public ctx!: GPUCanvasContext;
  public device!: GPUDevice

  async init() {
    console.log(shaderModule);
    this.initCanvas();
    this.initWebGPUContext();
    this.initShaderModule()
  }

  private resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  private initShaderModule() {
    const module = this.device.createShaderModule({
      label: "my shader module",
      code: shaderModule
    })
  }

  private async initWebGPUContext() {
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
    const presentationFormat = navigator.gpu.getPreferredCanvasFormat();
    ctx?.configure({
      device,
      format: presentationFormat
    })

    this.ctx = ctx;
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

  onResize = () => {
    this.resize()
  }

}