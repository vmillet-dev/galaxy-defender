import { Component, ElementRef, EventEmitter, HostListener, Output, ViewChild } from '@angular/core';

@Component({
  selector: 'app-virtual-joystick',
  standalone: true,
  template: `
    <div #joystickContainer
         class="joystick-container"
         (touchstart)="onTouchStart($event)"
         (touchmove)="onTouchMove($event)"
         (touchend)="onTouchEnd()">
      <div #joystickBase class="joystick-base">
        <div #joystickHandle
             class="joystick-handle"
             [style.transform]="'translate(' + position.x + 'px, ' + position.y + 'px)'">
        </div>
      </div>
    </div>
  `,
  styles: [`
    .joystick-container {
      position: fixed;
      bottom: 20px;
      left: 20px;
      z-index: 1000;
      touch-action: none;
    }

    .joystick-base {
      width: 120px;
      height: 120px;
      background: rgba(255, 255, 255, 0.2);
      border: 2px solid rgba(255, 255, 255, 0.4);
      border-radius: 50%;
      position: relative;
    }

    .joystick-handle {
      width: 50px;
      height: 50px;
      background: rgba(255, 255, 255, 0.6);
      border-radius: 50%;
      position: absolute;
      top: 35px;
      left: 35px;
      cursor: pointer;
      transition: transform 0.1s ease;
    }
  `]
})
export class VirtualJoystickComponent {
  @ViewChild('joystickContainer') joystickContainer!: ElementRef;
  @ViewChild('joystickBase') joystickBase!: ElementRef;
  @ViewChild('joystickHandle') joystickHandle!: ElementRef;

  @Output() joystickMove = new EventEmitter<{dx: number, dy: number}>();

  position = { x: 0, y: 0 };
  private isActive = false;
  private baseRadius = 60;
  private maxDistance = 40;

  onTouchStart(event: TouchEvent): void {
    event.preventDefault();
    this.isActive = true;
    this.updateJoystickPosition(event.touches[0]);
  }

  onTouchMove(event: TouchEvent): void {
    if (!this.isActive) return;
    event.preventDefault();
    this.updateJoystickPosition(event.touches[0]);
  }

  onTouchEnd(): void {
    this.isActive = false;
    this.position = { x: 0, y: 0 };
    this.joystickMove.emit({ dx: 0, dy: 0 });
  }

  private updateJoystickPosition(touch: Touch): void {
    const rect = this.joystickBase.nativeElement.getBoundingClientRect();
    const centerX = rect.left + this.baseRadius;
    const centerY = rect.top + this.baseRadius;

    let dx = touch.clientX - centerX;
    let dy = touch.clientY - centerY;

    // Calculate distance from center
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Normalize if distance exceeds maxDistance
    if (distance > this.maxDistance) {
      dx = (dx / distance) * this.maxDistance;
      dy = (dy / distance) * this.maxDistance;
    }

    this.position = { x: dx, y: dy };

    // Emit normalized values between -1 and 1
    this.joystickMove.emit({
      dx: dx / this.maxDistance,
      dy: dy / this.maxDistance
    });
  }
}
