import { WebGPUManager } from "./webgpu-manager";
import { SVGManager } from "./svg-manager";



function main() {
  // const canvas = document.querySelector('canvas');
  // const canvasManager = new WebGPUManager();
  // canvasManager.init()

  const svg = document.querySelector('svg');
  if (!svg) {
    throw new Error("svg not found!");
  }
  const svgManager = new SVGManager(svg);
  svgManager.createRect(10, 10, 100, 100)
  svgManager.createRect(1000, 500, 100, 100)
  svgManager.createRect(500, 500, 100, 100)
}


main()