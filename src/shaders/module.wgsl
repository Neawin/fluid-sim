@vertex fn vs(@builtin(vertex_index) vertexIndex : u32) -> vertexIndex {
  return vertexIndex;
}

@fragment fn fs(fsInput : VertexShaderOutput) -> @location(0) vec4f {
  return vec4f(1,1,1,1);
}
