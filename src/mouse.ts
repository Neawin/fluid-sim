import { debounceTime, finalize, fromEvent, map, merge, switchMap, takeUntil } from "rxjs";
import { getVelocity, resetPosition } from "./utils";

export function mouseVelocityListener(onDragEnd: () => void, size: { width: number; height: number }) {
  const mousedown$ = fromEvent(window, "mousedown");
  const mousemove$ = fromEvent(window, "mousemove");
  const mouseup$ = fromEvent(window, "mouseup");
  const mouseStopped$ = mousemove$.pipe(debounceTime(200));

  return mousedown$.pipe(
    switchMap((downEvent: Event) => {
      const mouseDownEv = downEvent as MouseEvent;
      const x = mouseDownEv.x;
      const y = mouseDownEv.y;
      resetPosition(x, y);
      return merge(mousemove$, mouseStopped$).pipe(
        takeUntil(mouseup$),
        finalize(() => {
          onDragEnd();
        }),
        map((e) => {
          const ev = e as MouseEvent;
          const xnorm = ev.x / size.width;
          const ynorm = 1.0 - ev.y / size.height;
          const velocity = getVelocity(ev);
          return {
            position: [xnorm, ynorm],
            velocity,
          };
        }),
      );
    }),
  );
}
