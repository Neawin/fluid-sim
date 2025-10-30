import { Injectable } from '@angular/core';
import {
  getWebGLContext,
  resizeCanvasToDisplaySize,
} from './webgl-utils';
import { ProgramManager } from '@app/core/webgl/program-manager';

@Injectable({
  providedIn: 'root',
})
export class WebglManager {
  gl!: WebGL2RenderingContext;
  programManager!: ProgramManager;
  texture!: WebGLTexture;
  attributes: any = {}
  uniforms: any = {}
  then = 0;
  mousePosition = {
    x: 0,
    y: 0
  }
  config = {
    GRID_RES: 32
  }

  init(canvas: HTMLCanvasElement) {
    this.gl = getWebGLContext(canvas);
    const gl = this.gl;
    const now = performance.now()

    gl.canvas.width = window.innerWidth;
    gl.canvas.height = window.innerHeight;
    this.programManager = new ProgramManager(gl);
    this.programManager.init()
    const program = this.programManager.program;


    if (!program) {
      throw new Error('Program not initialized');
    }


    this.setAttrsAndUniforms()


    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);

    this.initPositionBuffer();
    // BIND POSITION ATTRIBUTE
    gl.enableVertexAttribArray(this.attributes['a_position']);
    let size = 2;
    let type = gl.FLOAT;
    let normalize = false;
    let stride = 0;
    let AttrOffset = 0;
    gl.vertexAttribPointer(this.attributes['a_position'], size, type, normalize, stride, AttrOffset);

    this.initTexCoordBuffer();
    // BIND TEXCOORD ATTRIBUTE
    size = 2;
    type = gl.FLOAT;
    normalize = false;
    stride = 0;
    AttrOffset = 0;
    gl.enableVertexAttribArray(this.attributes['a_texcoord']);
    gl.vertexAttribPointer(this.attributes['a_texcoord'], size, type, normalize, stride, AttrOffset);


    const textureWidth = 32;
    const textureHeight = 16;
    this.texture = this.createTexture(textureWidth, textureHeight);


    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.useProgram(program);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.uniform1i(this.uniforms['u_texture'], 0);
    gl.uniform2f(this.uniforms['u_resolution'], gl.canvas.width, gl.canvas.height);
    gl.uniform2f(this.uniforms['u_texelSize'], 1 / textureWidth, 1 / textureHeight);

    requestAnimationFrame(() => this.render(now))
  }


  initPositionBuffer() {
    const gl = this.gl;
    const canvas = <HTMLCanvasElement>this.gl.canvas;
    const positions = [
      0, 0, canvas.width, 0, 0, canvas.height,
      canvas.width, 0, 0, canvas.height, canvas.width, canvas.height
    ]
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);
  }

  initTexCoordBuffer() {
    const gl = this.gl;
    const texCoords = [
      0, 0, 1, 0, 0, 1,
      1, 0, 0, 1, 1, 1
    ]
    const texCoordBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(texCoords), gl.STATIC_DRAW);
  }

  getDeltaTime(now: number): number {
    now *= 0.001;
    const deltaTime = now - this.then;
    this.then = now;
    return deltaTime;
  }

  createTexture(w: number, h: number) {
    const gl = this.gl;
    const texture = gl.createTexture()
    const level = 0;
    const internalFormat = gl.RG8;
    const border = 0;
    const format = gl.RG;
    const type = gl.UNSIGNED_BYTE;
    const data = new Uint8Array(Array.from({ length: w * h * 2 }, () => Math.floor(Math.random() * 255)));

    for (let i = 0; i <= 10; i++) {
    }
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    gl.texImage2D(gl.TEXTURE_2D, level, internalFormat, w, h, border,
      format, type, data);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return texture;
  }

  encode(num: number) {
    const newVal = ((num) / 255) * (1 + 1) - 1
    return newVal;
  }

  setAttrsAndUniforms() {
    const gl = this.gl
    const program = this.programManager.program!;
    this.attributes['a_position'] = gl.getAttribLocation(program, 'a_position');
    this.attributes['a_texcoord'] = gl.getAttribLocation(program, 'a_texcoord');
    this.uniforms['u_resolution'] = gl.getUniformLocation(program, 'u_resolution');
    this.uniforms['u_mouse'] = gl.getUniformLocation(program, 'u_mouse');
    this.uniforms['u_texelSize'] = gl.getUniformLocation(program, 'u_texelSize');
    this.uniforms['u_time'] = gl.getUniformLocation(program, 'u_time');
    this.uniforms['u_texture'] = gl.getUniformLocation(program, 'u_texture');
  }

  render(now: number) {
    const deltaTime = this.getDeltaTime(now);
    now = performance.now();

    const gl = this.gl;
    const canvas = <HTMLCanvasElement>this.gl.canvas;
    resizeCanvasToDisplaySize(canvas);

    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.uniform2f(this.uniforms['u_mouse'], this.mousePosition.x, this.mousePosition.y)
    gl.uniform1f(this.uniforms['u_time'], deltaTime)


    const primitiveType = gl.TRIANGLES;
    const offset = 0;
    const count = 6;

    gl.drawArrays(primitiveType, offset, count);
    requestAnimationFrame(() => this.render(now));
  }
}
