import { CanvasManager } from "./canvas-manager";



async function main() {
  const canvasManager = new CanvasManager();
  await canvasManager.init()
}


main()