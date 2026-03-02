import { randomColor } from "./utils";

export function initTextureData(width: number, height: number): number[][] {
  const data: number[][] = [];
  for (let i = 0; i < width; i++) {
    for (let j = 0; j < height; j++) {
      const pointData = [randomColor(), randomColor(), randomColor(), 0];
      data.push(pointData);
    }
  }
  return data;
}

export function createTexture(device: GPUDevice, width: number, height: number) {
  const tex = device.createTexture({
    label: "my texture",
    size: [width, height],
    dimension: "2d",
    format: "rgba8unorm",
    usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.COPY_SRC | GPUTextureUsage.STORAGE_BINDING,
  });
  return tex;
}
