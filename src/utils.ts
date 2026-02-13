let prevX = 0;
let prevY = 0;
let prevT = performance.now();

export function getVelocity(e: MouseEvent) {
  const x = e.x;
  const y = e.y;
  const dx = x - prevX;
  const dy = y - prevY;
  const t = performance.now();
  const dt = prevT - t;

  const velocityX = dx / dt;
  const velocityY = dy / dt;

  prevX = x;
  prevY = y;
  prevT = t;

  return [-velocityX, velocityY];
}

export function randomColor() {
  return Math.floor(Math.random() * 255);
}
