struct VertexShaderOutput {
  @builtin(position) position : vec4f,
};

@vertex fn vs(@builtin(vertex_index) vertexIndex : u32) -> VertexShaderOutput {
  let pos = array(
  vec2f(0.0, 0.5),
  vec2f(-0.5, -0.5),
  vec2f(0.5, -0.5),
  );
  var vsOutput : VertexShaderOutput;
  vsOutput.position = vec4f(pos[vertexIndex], 0.0, 1.0);
  return vsOutput;
}

@fragment fn fs(fsInput : VertexShaderOutput) -> @location(0) vec4f {
  let red = vec4f(1, 0, 0, 1);
  let cyan = vec4f(0, 1, 1, 1);

  let grid = vec2u(fsInput.position.xy) / 8;
  let checker = (grid.x + grid.y) % 2 == 1;


  return select(red, cyan, checker);
}
