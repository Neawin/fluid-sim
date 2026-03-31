import { config } from "./config";
import type { IDoubleTexture } from "./models";

export function initProjectData(width: number, height: number): number[][] {
  const data: number[][] = [];
  for (let i = 0; i < width; i++) {
    for (let j = 0; j < height; j++) {
      data.push([0, 0, 0, 255]);
    }
  }
  return data;
}

export function initTextureData(width: number, height: number): number[][] {
  const data: number[][] = [];
  for (let i = 0; i < width; i++) {
    for (let j = 0; j < height; j++) {
      data.push([0, 0, 0, 255]);
    }
  }
  return data;
}

export function initVelocityData(width: number, height: number): number[][] {
  const data: number[][] = [];

  for (let j = 0; j < height; j++) {
    for (let i = 0; i < width; i++) {
      const pointData = [0, 0, 0, 255];
      data.push(pointData);
    }
  }

  return data;
}

export function createTexture(label: string, device: GPUDevice, width: number, height: number, format: GPUTextureFormat) {
  const tex = device.createTexture({
    label,
    size: [width, height],
    dimension: "2d",
    format,
    usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.COPY_SRC | GPUTextureUsage.STORAGE_BINDING,
  });
  return tex;
}

export function createDoubleTexture(device: GPUDevice, format: GPUTextureFormat): IDoubleTexture {
  const textureWidth = config.TEXTURE_WIDTH;
  const textureHeight = config.TEXTURE_HEIGHT;

  let tex1 = createTexture("tex1", device, textureWidth, textureHeight, format);
  let tex2 = createTexture("tex2", device, textureWidth, textureHeight, format);

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
