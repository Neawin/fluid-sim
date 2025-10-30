import { Component, ElementRef, inject, viewChild } from '@angular/core';
import { WebglManager } from './core/webgl/webgl-manager';

@Component({
  selector: 'app-root',
  imports: [],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  canvas = viewChild<ElementRef<HTMLCanvasElement>>('fluid');
  protected readonly webglManager = inject(WebglManager);
  ngAfterViewInit(): void {
    const canvas = <HTMLCanvasElement>this.canvas()?.nativeElement;
    this.webglManager.init(canvas)
  }
}

