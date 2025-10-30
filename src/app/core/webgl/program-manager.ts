import { ShaderManager } from '@app/core/webgl/shader-manager';
import { createProgram } from '@app/core/webgl/webgl-utils';

export class ProgramManager {
  public program: WebGLProgram | null = null;
  private shaderManager: ShaderManager;
  constructor(private gl: WebGL2RenderingContext) {
    this.shaderManager = new ShaderManager(this.gl);
    this.shaderManager.initShaders();
  }

  init() {
    const gl = this.gl;
    this.program = createProgram(gl, this.shaderManager.vertexShader, this.shaderManager.fragShader);
  }
}
