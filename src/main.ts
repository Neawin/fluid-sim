import { run } from "./shaders-main";
import { SVGManager } from "./svg-manager";

function main() {
  run()

  const svg = document.querySelector('svg');
  if (!svg) {
    throw new Error("svg not found!");
  }
  const svgManager = new SVGManager(svg);
  // svgManager.init()
}


main()
