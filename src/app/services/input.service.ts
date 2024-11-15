import { Injectable } from '@angular/core';
import { fromEvent, merge, Observable } from 'rxjs';
import { filter, map, tap } from 'rxjs/operators';

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
    const keyDown = fromEvent<KeyboardEvent>(gameContainer, 'keydown').pipe(
      tap(event => {
        this.activeKeys.add(event.key);
      })
    );

    const keyUp = fromEvent<KeyboardEvent>(gameContainer, 'keyup').pipe(
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
    console.log('Setting up fire handler');

    // Keyboard fire control with enhanced debug logging - bind to window for global keyboard capture
    const keyboardFire = fromEvent<KeyboardEvent>(window, 'keydown').pipe(
      tap(event => {
        console.log('Keydown event detected:', {
          code: event.code,
          key: event.key,
          target: event.target,
          currentTarget: event.currentTarget
        });
      }),
      filter((event: KeyboardEvent) => {
        const isSpaceKey = event.code === 'Space' || event.key === ' ' || event.key === 'Spacebar';
        console.log('Is space key?', isSpaceKey);
        return isSpaceKey;
      }),
      tap((event: KeyboardEvent) => {
        console.log('Space pressed - firing weapon');
        event.preventDefault();
      }),
      map(() => void 0)
    );

    // Touch fire control (tap)
    const touchFire = fromEvent<TouchEvent>(gameContainer, 'touchstart').pipe(
      tap((event: TouchEvent) => event.preventDefault()),
      map(() => void 0)
    );

    // Merge keyboard and touch fire events
    return merge(keyboardFire, touchFire);
  }
}
