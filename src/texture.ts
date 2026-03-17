import { config } from "./config";
import type { IDoubleTexture } from "./models";
import { randomColor } from "./utils";

export function initTextureData(width: number, height: number): number[][] {
  const data: number[][] = [];
  for (let i = 0; i < width; i++) {
    for (let j = 0; j < height; j++) {
      data.push([0, 0, 0, 0]);
    }
  }
  return data;
}

export function initVelocityData(width: number, height: number): number[][] {
  const data: number[][] = [];
  const cx = width / 2;
  const cy = height / 2;

  for (let j = 0; j < height; j++) {
    for (let i = 0; i < width; i++) {
      const dx = cx - i;
      const dy = cy - j;
      const d = Math.sqrt(Math.pow(dx, 2) + Math.pow(dy, 2));
      const nx = dx / d;
      const ny = dy / d;
      const r = (nx + 1) * 0.5 * 255;
      const g = (ny + 1) * 0.5 * 255;
      if (d === 0) {
        data.push([128, 128, 0, 255]);
        continue;
      }
      const pointData = [Math.round(r), Math.round(g), 0, 255];
      data.push(pointData);
    }
  }
  data[3][0] = 0;

  return data;
}

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

export function createDoubleTexture(device: GPUDevice): IDoubleTexture {
  const textureWidth = config.TEXTURE_WIDTH;
  const textureHeight = config.TEXTURE_HEIGHT;

  let tex1 = createTexture("tex1", device, textureWidth, textureHeight);
  let tex2 = createTexture("tex2", device, textureWidth, textureHeight);

  return {
    get tex1() {
      return tex1;
    },
    get tex2() {
      return tex2;
    },
    swap: () => {
      let temp = tex1;
      tex1 = tex2;
      tex2 = temp;
    },
  };
}
