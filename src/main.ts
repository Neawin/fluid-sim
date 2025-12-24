import { WebGPUManager } from "./webgpu-manager";
import { SVGManager } from "./svg-manager";



function main() {
  const canvasManager = new WebGPUManager();
  canvasManager.init()

  const svg = document.querySelector('svg');
  if (!svg) {
    throw new Error("svg not found!");
  }
  const svgManager = new SVGManager(svg);
  const size = 40;
  const num = 3;
  for (let i = 0; i < num; i++) {
    const x = Math.floor(Math.random() * 1000)
    const y = Math.floor(Math.random() * 400)
    svgManager.createRect(x, y, size, size)
  }
}


main()