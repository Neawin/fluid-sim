import { randomColor } from "./utils";

export function initTextureData(width: number, height: number): number[][] {
  const data: number[][] = [];
  const centerX = Math.floor(width / 2);
  const centerY = Math.floor(height / 2);
  const radius = 40;

  for (let i = 0; i < width; i++) {
    for (let j = 0; j < height; j++) {
      const dx = i - centerX;
      const dy = j - centerY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const val = dist < radius ? 255 : 0;
      data.push([val, val, val, 0]);
    }
  }
  return data;
}

// export function initTextureData(width: number, height: number): number[][] {
//   const data: number[][] = [];
//   for (let i = 0; i < width; i++) {
//     for (let j = 0; j < height; j++) {
//       const pointData = [randomColor(), randomColor(), randomColor(), 0];
//       data.push(pointData);
//     }
//   }
//   return data;
// }

export function createTexture(label: string, device: GPUDevice, width: number, height: number) {
  const tex = device.createTexture({
    label,
    size: [width, height],
    dimension: "2d",
    format: "rgba8unorm",
    usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.COPY_SRC | GPUTextureUsage.STORAGE_BINDING,
  });
  return tex;
}
