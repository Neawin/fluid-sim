export class SVGManager {
  private root: SVGSVGElement;
  constructor(root: SVGSVGElement) {
    this.root = root;
  }

  createRect(x: number, y: number, width: number, height: number) {
    const ns = 'http://www.w3.org/2000/svg'
    const rect = document.createElementNS(ns, 'rect');
    rect.setAttribute('x', x.toString())
    rect.setAttribute('y', y.toString())
    rect.setAttribute('width', width.toString())
    rect.setAttribute('height', height.toString())
    rect.setAttribute("fill", 'none')
    rect.setAttribute('stroke', 'black')
    this.root.appendChild(rect)
  }



}