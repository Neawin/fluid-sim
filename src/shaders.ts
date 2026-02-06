import { createDisplayPipeline } from "./pipelines";



function randomColor() {
  return Math.floor(Math.random() * 255)
}

export async function run() {
  const canvas = document.querySelector('#webgpu-canvas') as HTMLCanvasElement;
  canvas.width = canvas.clientWidth * devicePixelRatio;
  canvas.height = canvas.clientHeight * devicePixelRatio;

  const size = { width: canvas.width, height: canvas.height }

  const adapter = await navigator.gpu.requestAdapter();
  const device = await adapter?.requestDevice();
  const ctx = canvas.getContext('webgpu') as GPUCanvasContext;


  if (!device) {
    throw new Error("Device not initialized!")
  }

  ctx.configure({
    device: device,
    format: navigator.gpu.getPreferredCanvasFormat()
  })



  const pipeline = await createDisplayPipeline(device);

  // CREATE TEXTURE
  const textureWidth = 24;
  const textureHeight = 20;

  const data: number[][] = []
  for (let i = 0; i < textureWidth; i++) {
    for (let j = 0; j < textureHeight; j++) {
      const pointData = [randomColor(), randomColor()];
      data.push(pointData)
    }
  }
  const textureData = new Uint8Array(
    data.flat()
  );

  const texture = device.createTexture({
    label: "my texture",
    size: [textureWidth, textureHeight],
    dimension: '2d',
    format: 'rg8unorm',
    usage:
      GPUTextureUsage.TEXTURE_BINDING |
      GPUTextureUsage.COPY_DST | GPUTextureUsage.COPY_SRC
  })

  device.queue.writeTexture({ texture }, textureData, { bytesPerRow: textureWidth * 2 }, { width: textureWidth, height: textureHeight });

  const sampler = device.createSampler()



  // CREATE POINTS BUFFER
  const pointsData = new Float32Array(getPoints(ctx).flat());
  const pointBuffer = device.createBuffer({
    label: "points buffer",
    usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    size: pointsData.byteLength
  })
  device.queue.writeBuffer(pointBuffer, 0, pointsData)




  const renderPassDescriptor: GPURenderPassDescriptor = {
    label: 'my render pass descriptor',
    colorAttachments: [
      {
        view: ctx.getCurrentTexture().createView(),
        clearValue: [0.3, 0.3, 0.3, 1],
        loadOp: 'clear',
        storeOp: 'store'
      }
    ]
  }

  const frame = () => {
    const bindGroup = device.createBindGroup({
      layout: pipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: sampler },
        { binding: 1, resource: texture }
      ]
    })

    const pointsData = new Float32Array(getPoints(ctx).flat());
    device.queue.writeBuffer(pointBuffer, 0, pointsData)


    const colorAttachments = renderPassDescriptor.colorAttachments as GPURenderPassColorAttachment[]
    colorAttachments[0].view = ctx.getCurrentTexture();

    const encoder = device.createCommandEncoder({ label: "my encoder" });

    const pass = encoder.beginRenderPass(renderPassDescriptor);

    pass.setPipeline(pipeline);
    pass.setBindGroup(0, bindGroup);
    pass.draw(6);
    pass.end();

    const commandBuffer = encoder.finish();
    device.queue.submit([commandBuffer]);
    requestAnimationFrame(frame)
  }

  frame()

}


function getPoints(ctx: GPUCanvasContext): number[][] {
  const rects: NodeListOf<SVGRectElement> = document.querySelectorAll('rect');
  const arr = Array.from(rects);
  const points = arr.map((rect) => [(rect.x.baseVal.value / ctx.canvas.width) * 2 - 1, 1 - (rect.y.baseVal.value / ctx.canvas.height) * 2])
  return points
}

