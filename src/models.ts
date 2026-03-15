export interface IBuffer {
  buffer: GPUBuffer;
  size: number;
  data: ArrayBuffer;
  view: Float32Array;
}

export interface VelocitField {
  textures: IDoubleTexture;
  data: number[];
}

export interface IDoubleTexture {
  tex1: GPUTexture;
  tex2: GPUTexture;
  swap: () => void;
}

export interface IBindingGroups {
  baseBindGroup: GPUBindGroup;
  checkerboardBindGroup: GPUBindGroup;
  diffusionBindGroup: GPUBindGroup;
  advectBindGroup: GPUBindGroup;
  velocityAdvectBindGroup: GPUBindGroup;
  velocityDiffusionBindGroup: GPUBindGroup;
  projectBindGroup: GPUBindGroup;
  velocityVectorsBindGroup: GPUBindGroup;
}
