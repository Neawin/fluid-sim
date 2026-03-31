import { FluidSimulator } from "./fluid-simulator";

async function main() {
  const canvas = document.querySelector("#webgpu-canvas") as HTMLCanvasElement;
  await FluidSimulator.create(canvas);

  const svg = document.querySelector("svg");
  if (!svg) {
    throw new Error("svg not found!");
  }
}

main();
