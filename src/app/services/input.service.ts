import { Injectable } from '@angular/core';
import { fromEvent, merge, Observable } from 'rxjs';
import { map, tap } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class InputService {
  private readonly MOVEMENT_SPEED = 1;
  private activeKeys = new Set<string>();
  private joystickMovement = { dx: 0, dy: 0 };

  constructor() {}

  setupInputHandlers(gameContainer: HTMLElement): Observable<{ dx: number; dy: number }> {
    // Track key states
    const keyDown = fromEvent<KeyboardEvent>(window, 'keydown').pipe(
      tap(event => {
        this.activeKeys.add(event.key);
      })
    );

    const keyUp = fromEvent<KeyboardEvent>(window, 'keyup').pipe(
      tap(event => {
        this.activeKeys.delete(event.key);
      })
    );

    // Keyboard movement stream
    const keyboardInput = merge(keyDown, keyUp).pipe(
      map(() => {
        const movement = { dx: 0, dy: 0 };
        const speed = this.MOVEMENT_SPEED;

        if (this.activeKeys.has('ArrowLeft') || this.activeKeys.has('a') || this.activeKeys.has('q')) {
          movement.dx -= speed;
        }
        if (this.activeKeys.has('ArrowRight') || this.activeKeys.has('d')) {
          movement.dx += speed;
        }
        if (this.activeKeys.has('ArrowUp') || this.activeKeys.has('w') || this.activeKeys.has('z')) {
          movement.dy -= speed;
        }
        if (this.activeKeys.has('ArrowDown') || this.activeKeys.has('s')) {
          movement.dy += speed;
        }

        return movement;
      })
    );

    // Joystick movement stream
    const touchMove = fromEvent<TouchEvent>(gameContainer, 'touchmove').pipe(
      map(() => ({
        dx: this.joystickMovement.dx * this.MOVEMENT_SPEED,
        dy: this.joystickMovement.dy * this.MOVEMENT_SPEED
      }))
    );

    const touchEnd = fromEvent<TouchEvent>(gameContainer, 'touchend').pipe(
      tap(() => {
        this.joystickMovement = { dx: 0, dy: 0 };
      }),
      map(() => ({ dx: 0, dy: 0 }))
    );

    const joystickInput = merge(touchMove, touchEnd);

    // Merge keyboard and joystick inputs
    return merge(keyboardInput, joystickInput);
  }

  // Method to update joystick movement from VirtualJoystickComponent
  updateJoystickMovement(movement: { dx: number; dy: number }): void {
    this.joystickMovement = movement;
  }

  setupFireHandler(gameContainer: HTMLElement): Observable<void> {
    // Keyboard fire control
    const keyboardFire = fromEvent<KeyboardEvent>(window, 'keydown').pipe(
      map(event => {
        if (event.code === 'Space') {
          event.preventDefault();
          return void 0; // Emit void when space is pressed
        }
        return undefined; // Filter out non-space key presses
      }),
      // Filter out undefined values (non-space key presses)
      map(value => value as void)
    );

    // Touch fire control (tap)
    const touchFire = fromEvent<TouchEvent>(gameContainer, 'touchstart').pipe(
      tap(event => event.preventDefault()),
      map(() => void 0)
    );

    return merge(keyboardFire, touchFire);
  }
}
