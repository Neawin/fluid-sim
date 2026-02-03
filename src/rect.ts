export class Rectangle {
  label: SVGTextElement
  element: SVGRectElement;


  constructor(x: number, y: number, width: number, height: number) {
    this.element = this.createElement(x, y, width, height);
    this.label = this.createLabel(x + width / 2, y);
  }

  createElement(x: number, y: number, width: number, height: number) {
    const ns = "http://www.w3.org/2000/svg";
    const rect = document.createElementNS(ns, "rect");
    rect.setAttribute("x", x.toString());
    rect.setAttribute("y", y.toString());
    rect.setAttribute("width", width.toString());
    rect.setAttribute("height", height.toString());
    rect.setAttribute("fill", "transparent");
    rect.setAttribute("stroke", "#fff");
    return rect;
  }

  createLabel(x: number, y: number) {
    let newX = +x / (window.innerWidth) - 1;
    let newY = +y / (window.innerHeight) - 1;
    const ns = "http://www.w3.org/2000/svg";
    const text: SVGTextElement = document.createElementNS(ns, "text");
    text.setAttribute("x", x.toString());
    text.setAttribute("y", y.toString());
    text.setAttribute('fill', 'white')
    text.setAttribute('text-anchor', 'middle')
    text.textContent = `${newX.toFixed(2)}, ${-newY.toFixed(2)}`
    // const parent = this.element.p;
    console.log(parent);
    this.element.parentElement?.appendChild(text)
    return text;
  }
}