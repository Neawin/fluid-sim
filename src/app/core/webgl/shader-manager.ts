import { createShader } from '@app/core/webgl/webgl-utils';
import vertexShaderSource from '@app/core/shaders/vertex.glsl';
import fragmentShaderSource from '@app/core/shaders/frag.glsl';

export class ShaderManager {
  public vertexShader!: WebGLShader;
  public fragShader!: WebGLShader;

  constructor(private gl: WebGL2RenderingContext) {}

  initShaders() {
    const gl = this.gl;
    this.vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
    this.fragShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
  }
}
