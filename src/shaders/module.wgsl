struct Vertex {
  @location(0) position : vec2f,
}

@vertex fn vs(vert : Vertex) -> @builtin(position) vec4f {
  return vec4f(vert.position, 0.0, 1.0);
}

@fragment fn fs() -> @location(0) vec4f {
  return vec4f(1, 1, 1, 1);
}
