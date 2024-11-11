import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-game-hud',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule],
  templateUrl: './game-hud.component.html',
  styleUrls: ['./game-hud.component.scss']
})
export class GameHudComponent {
  score: number = 0;
  wave: number = 1;
  health: number = 100;

  pauseGame(): void {
    // Implement pause functionality
    console.log('Game paused');
  }

  upgradeWeapon(): void {
    // Implement weapon upgrade functionality
    console.log('Weapon upgrade requested');
  }

  healShip(): void {
    // Implement healing functionality
    console.log('Healing requested');
  }
}
