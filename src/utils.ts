let prevX = 0;
let prevY = 0;
let prevTime = performance.now();

export function resetPosition(x: number, y: number) {
  prevX = x;
  prevY = y;
}

export function getVelocity(e: MouseEvent) {
  const x = e.x;
  const y = e.y;
  const dx = x - prevX;
  const dy = y - prevY;
  prevX = x;
  prevY = y;

  const force = 100;

  const height = document.documentElement.clientHeight;
  const width = document.documentElement.clientWidth;
  const normVelocityX = clamp((dx / width) * force, -1, 1);
  const normVelocityY = clamp((dy / height) * force, -1, 1);

  return [normVelocityX, -normVelocityY];
}

export function randomColor() {
  return Math.floor(Math.random() * 255);
}

export function clamp(x: number, min: number, max: number) {
  return Math.max(min, Math.min(x, max));
}

export function calcDeltaTime() {
  const dt = (performance.now() - prevTime) / 1000;
  prevTime = performance.now();
  return dt;
}
