import { filter, from, fromEvent, map, switchMap, takeUntil } from "rxjs";

export class SVGManager {
  private root: SVGSVGElement;
  public shapes: SVGElement[] = []
  constructor(root: SVGSVGElement) {
    this.root = root;
    this.initEvents();
  }

  private initEvents() {
    const mousedown = fromEvent<MouseEvent>(window, "mousedown");
    const mouseup = fromEvent<MouseEvent>(window, "mouseup");
    const mousemove = fromEvent<MouseEvent>(window, "mousemove");

    mousedown
      .pipe(
        filter((e) => e.target instanceof SVGRectElement),
        switchMap((e1) =>
          mousemove.pipe(
            map((e2) => [e1, e2]),
            takeUntil(mouseup)
          )
        )
      )
      .subscribe(([e1, e2]) => {
        const target = e1.target as SVGRectElement;

        const x = parseInt(target.getAttribute('x') || '0');
        const y = parseInt(target.getAttribute('y') || '0');

        const newX = x + e2.movementX;
        const newY = y + e2.movementY;

        target.setAttribute('x', newX.toString());
        target.setAttribute('y', newY.toString());
      });
  }

  createRect(x: number, y: number, width: number, height: number) {
    const ns = "http://www.w3.org/2000/svg";
    const rect = document.createElementNS(ns, "rect");
    rect.setAttribute("x", x.toString());
    rect.setAttribute("y", y.toString());
    rect.setAttribute("width", width.toString());
    rect.setAttribute("height", height.toString());
    rect.setAttribute("fill", "transparent");
    rect.setAttribute("stroke", "#fff");
    this.root.appendChild(rect);
    this.shapes.push(rect)
  }

  init() {
    const size = 40;
    const num = 3;
    for (let i = 0; i < num; i++) {
      const x = Math.floor(Math.random() * 1000)
      const y = Math.floor(Math.random() * 400)
      this.createRect(x, y, size, size)
    }
  }
}
