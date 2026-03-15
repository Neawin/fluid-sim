struct CellInput {
  cellWidth : f32,
  cellHeight : f32
}

struct VertexOut {
  @builtin(position) position : vec4f,
  @location(0) uv : vec2f,
}

@group(0) @binding(0) var<uniform> cellUniform : CellInput;

@vertex fn vs(
@builtin(vertex_index) vertexIndex : u32
) -> @builtin(position) vec4f
{
  let pos = array(
  vec2f(-1, 1),
  vec2f(-1, -1),
  vec2f(1, 1),
  vec2f(-1, -1),
  vec2f(1, -1),
  vec2f(1, 1)
  );


  var xy = pos[vertexIndex];
  var uv = xy * 0.5 + 0.5;

  return vec4f(xy, 1, 1);
}

@fragment fn fs(@builtin(position) pos : vec4f) -> @location(0) vec4f {
  //or i can just use it here @builtint position
  let cellWidth = cellUniform.cellWidth;
  let cellHeight = cellUniform.cellHeight;

  //that would be int part of
  let x = pos.x / cellWidth;
  let y = pos.y / cellHeight;
  let xEven = i32(floor(x)) % 2 == 0;
  let yEven = i32(floor(y)) % 2 == 0;
  let c = select(0.0, 1.0, xEven == yEven);

  return vec4f(c, c, c, 0.2);
}
