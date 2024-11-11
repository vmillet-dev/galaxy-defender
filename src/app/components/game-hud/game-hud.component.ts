import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { GameService } from '../../services/game.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-game-hud',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule],
  templateUrl: './game-hud.component.html',
  styleUrls: ['./game-hud.component.scss']
})
export class GameHudComponent implements OnInit, OnDestroy {
  score: number = 0;
  wave: number = 1;
  health: number = 100;
  private gameStateSubscription?: Subscription;

  constructor(private gameService: GameService) {}

  ngOnInit(): void {
    this.gameStateSubscription = this.gameService.gameState$.subscribe(state => {
      this.score = state.score;
      this.wave = state.wave;
      this.health = state.player.health;
    });
  }

  ngOnDestroy(): void {
    if (this.gameStateSubscription) {
      this.gameStateSubscription.unsubscribe();
    }
  }

  pauseGame(): void {
    // Implement pause functionality
    this.gameService.pauseGame();
  }

  upgradeWeapon(): void {
    // TODO: Implement weapon upgrade functionality
    console.log('Weapon upgrade requested');
  }

  healShip(): void {
    // TODO: Implement healing functionality
    console.log('Healing requested');
  }
}
