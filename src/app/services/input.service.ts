import { Injectable } from '@angular/core';
import { fromEvent, merge, Observable } from 'rxjs';
import { map, tap } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class InputService {
  private readonly MOVEMENT_SPEED = 5;
  private touchStartX = 0;
  private touchStartY = 0;

  constructor() {}

  setupInputHandlers(gameContainer: HTMLElement): Observable<{ dx: number; dy: number }> {
    // Keyboard controls
    const keyboardInput = merge(
      fromEvent<KeyboardEvent>(window, 'keydown'),
      fromEvent<KeyboardEvent>(window, 'keyup')
    ).pipe(
      map(event => {
        const movement = { dx: 0, dy: 0 };
        const speed = this.MOVEMENT_SPEED;
        const isKeyDown = event.type === 'keydown';

        switch (event.key) {
          case 'ArrowLeft':
          case 'a':
            movement.dx = isKeyDown ? -speed : 0;
            break;
          case 'ArrowRight':
          case 'd':
            movement.dx = isKeyDown ? speed : 0;
            break;
          case 'ArrowUp':
          case 'w':
            movement.dy = isKeyDown ? -speed : 0;
            break;
          case 'ArrowDown':
          case 's':
            movement.dy = isKeyDown ? speed : 0;
            break;
        }

        return movement;
      })
    );

    // Touch controls
    const touchStart = fromEvent<TouchEvent>(gameContainer, 'touchstart').pipe(
      tap(event => {
        event.preventDefault();
        this.touchStartX = event.touches[0].clientX;
        this.touchStartY = event.touches[0].clientY;
      }),
      map(() => ({ dx: 0, dy: 0 }))
    );

    const touchMove = fromEvent<TouchEvent>(gameContainer, 'touchmove').pipe(
      tap(event => event.preventDefault()),
      map(event => {
        const touchX = event.touches[0].clientX;
        const touchY = event.touches[0].clientY;
        const dx = (touchX - this.touchStartX) / 20; // Adjust sensitivity
        const dy = (touchY - this.touchStartY) / 20;

        this.touchStartX = touchX;
        this.touchStartY = touchY;

        return {
          dx: Math.abs(dx) > 0.1 ? dx : 0,
          dy: Math.abs(dy) > 0.1 ? dy : 0
        };
      })
    );

    const touchEnd = fromEvent<TouchEvent>(gameContainer, 'touchend').pipe(
      tap(event => event.preventDefault()),
      map(() => ({ dx: 0, dy: 0 }))
    );

    // Merge all input streams
    return merge(keyboardInput, touchStart, touchMove, touchEnd);
  }

  setupFireHandler(gameContainer: HTMLElement): Observable<void> {
    // Keyboard fire control
    const keyboardFire = fromEvent<KeyboardEvent>(window, 'keydown').pipe(
      map(event => {
        if (event.code === 'Space') {
          event.preventDefault();
          return;
        }
      })
    );

    // Touch fire control (tap)
    const touchFire = fromEvent<TouchEvent>(gameContainer, 'touchstart').pipe(
      tap(event => event.preventDefault()),
      map(() => void 0)
    );

    return merge(keyboardFire, touchFire);
  }
}
