import { Component, ElementRef, OnDestroy, OnInit, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GameService } from '../../services/game.service';
import { InputService } from '../../services/input.service';
import { Subscription } from 'rxjs';
import { Enemy, PlayerShip, PowerUp, Projectile, GameState, VisualEffect } from '../../models/game-types';
import { EnemyType, PowerUpType, VisualEffectType, WeaponType, Direction } from '../../models/game-types';
import { VirtualJoystickComponent } from '../virtual-joystick/virtual-joystick.component';

@Component({
  selector: 'app-game-board',
  standalone: true,
  imports: [CommonModule, VirtualJoystickComponent],
  templateUrl: './game-board.component.html',
  styleUrls: ['./game-board.component.scss']
})
export class GameBoardComponent implements OnInit, OnDestroy, AfterViewInit {
  Direction = Direction; // Expose Direction enum to template
  @ViewChild('gameCanvas', { static: true }) private canvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('gameContainer') private gameContainer!: ElementRef<HTMLDivElement>;
  private ctx!: CanvasRenderingContext2D;
  private gameStateSubscription?: Subscription;
  private animationFrameId?: number;
  private inputSubscriptions: Subscription[] = [];

  // Public properties for canvas dimensions
  public canvasWidth: number = window.innerWidth;
  public canvasHeight: number = window.innerHeight;
  public isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

  constructor(
    private gameService: GameService,
    private inputService: InputService
  ) {
    // Listen for window resize
    window.addEventListener('resize', () => {
      this.canvasWidth = window.innerWidth;
      this.canvasHeight = window.innerHeight;
      this.setupCanvas();
    });
  }

  ngOnInit(): void {
    const canvas = this.canvas.nativeElement;
    this.ctx = canvas.getContext('2d')!;
    this.setupCanvas();
    this.startGame();
  }

  ngAfterViewInit(): void {
    if (this.gameContainer?.nativeElement) {
      const container = this.gameContainer.nativeElement;

      // Focus the game container after view initialization
      container.focus();

      // Ensure container keeps focus when clicked
      container.addEventListener('mousedown', () => {
        container.focus();
      });

      // Subscribe to continuous movement updates
      this.inputSubscriptions.push(
        this.inputService.setupInputHandlers(container).subscribe(movement => {
          if (movement.dx !== 0 || movement.dy !== 0) {
            this.gameService.updatePlayerPosition(movement);
          }
        })
      );

      // Subscribe to fire events with debug logging
      this.inputSubscriptions.push(
        this.inputService.setupFireHandler(container).subscribe(() => {
          console.log('Fire event received in game board');
          this.gameService.fireWeapon();
        })
      );
    }
  }

  ngOnDestroy(): void {
    if (this.gameStateSubscription) {
      this.gameStateSubscription.unsubscribe();
    }
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
  }

  private setupCanvas(): void {
    const canvas = this.canvas.nativeElement;
    this.ctx = canvas.getContext('2d')!;

    // Enable image smoothing for better visual quality
    this.ctx.imageSmoothingEnabled = true;
    this.ctx.imageSmoothingQuality = 'high';

    // Set initial canvas size
    const resizeCanvas = () => {
      const container = canvas.parentElement;
      if (!container) return;

      // Calculate scale based on device pixel ratio
      const scale = window.devicePixelRatio || 1;

      // Set display size
      canvas.style.width = '100%';
      canvas.style.height = '100%';

      // Set actual size in memory
      canvas.width = container.clientWidth * scale;
      canvas.height = container.clientHeight * scale;

      // Scale context to match device pixel ratio
      this.ctx.scale(scale, scale);

      // Store canvas dimensions for game calculations
      this.canvasWidth = container.clientWidth;
      this.canvasHeight = container.clientHeight;
    };

    // Initial resize and add listener
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
  }

  // Make startGame public for template access
  public startGame(): void {
    this.gameService.startGame();
    this.gameStateSubscription = this.gameService.gameState$.subscribe(gameState => {
      this.render(gameState);
    });
  }
  private setupInputHandlers(): void {
    // Touch controls are handled by virtual joystick
    const gameContainer = this.canvas.nativeElement.parentElement!;

    // Setup fire event handler for mobile
    if (this.isMobileDevice) {
      gameContainer.addEventListener('touchstart', (event: TouchEvent) => {
        event.preventDefault();
        const touch = event.touches[0];
        const rect = gameContainer.getBoundingClientRect();
        const y = touch.clientY - rect.top;

        // Fire if touch is in the upper half of the screen
        if (y < rect.height / 2) {
          this.handleFireTouch();
        }
      });
    }
  }

  // Handle joystick movement events
  public onJoystickMove(movement: { dx: number; dy: number }): void {
    this.inputService.updateJoystickMovement(movement);
  }

  public handleDirectionalTouch(direction: Direction | 'none'): void {
    // Only used for mobile touch controls now
    if (direction === 'none') {
      this.gameService.stopPlayerMovement();
    } else {
      this.gameService.movePlayer(direction as Direction);
    }
  }

  public handleFireTouch(): void {
    this.gameService.fireWeapon();
  }

  private render(gameState: GameState): void {
    if (!this.ctx) return;

    // Clear canvas with a dark background
    this.ctx.fillStyle = '#000000';
    this.ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);

    // Add a subtle grid effect
    this.ctx.strokeStyle = '#1a1a1a';
    this.ctx.lineWidth = 1;
    const gridSize = 50;
    for (let x = 0; x < this.canvasWidth; x += gridSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x, this.canvasHeight);
      this.ctx.stroke();
    }
    for (let y = 0; y < this.canvasHeight; y += gridSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(this.canvasWidth, y);
      this.ctx.stroke();
    }

    // Render game entities
    if (gameState.player) {
      this.renderPlayer(gameState.player);
    }

    gameState.enemies.forEach(enemy => {
      this.renderEnemy(enemy);
    });

    gameState.projectiles.forEach(projectile => this.renderProjectile(projectile));
    gameState.powerUps.forEach(powerUp => this.renderPowerUp(powerUp));
    gameState.visualEffects.forEach((effect: VisualEffect) => this.renderVisualEffect(effect));
  }

  private renderPlayer(player: PlayerShip): void {
    this.ctx.fillStyle = player.shieldActive ? '#4CAF50' : '#2196F3';
    this.ctx.fillRect(
      player.position.x,
      player.position.y,
      player.width,
      player.height
    );
  }

  private renderEnemy(enemy: Enemy): void {
    const ctx = this.ctx;
    if (!ctx) return;

    ctx.save();
    ctx.translate(enemy.position.x, enemy.position.y);

    // Different shapes and colors for each enemy type
    switch (enemy.type) {
      case EnemyType.BASIC:
        ctx.beginPath();
        ctx.moveTo(0, -enemy.height / 2);
        ctx.lineTo(-enemy.width / 2, enemy.height / 2);
        ctx.lineTo(enemy.width / 2, enemy.height / 2);
        ctx.closePath();
        ctx.fillStyle = '#00ff00'; // Green
        break;
      case EnemyType.FAST:
        ctx.beginPath();
        ctx.moveTo(0, -enemy.height / 2);
        ctx.lineTo(enemy.width / 2, 0);
        ctx.lineTo(0, enemy.height / 2);
        ctx.lineTo(-enemy.width / 2, 0);
        ctx.closePath();
        ctx.fillStyle = '#00ffff'; // Cyan
        break;
      case EnemyType.TANK:
        ctx.beginPath();
        ctx.moveTo(-enemy.width / 2, 0);
        ctx.lineTo(-enemy.width / 4, -enemy.height / 2);
        ctx.lineTo(enemy.width / 4, -enemy.height / 2);
        ctx.lineTo(enemy.width / 2, 0);
        ctx.lineTo(enemy.width / 4, enemy.height / 2);
        ctx.lineTo(-enemy.width / 4, enemy.height / 2);
        ctx.closePath();
        ctx.fillStyle = '#ffa500'; // Orange
        break;
      case EnemyType.ELITE:
        ctx.beginPath();
        for (let i = 0; i < 8; i++) {
          const angle = (i * Math.PI * 2) / 8;
          const radius = i % 2 === 0 ? enemy.width / 2 : enemy.width / 4;
          ctx.lineTo(
            Math.cos(angle) * radius,
            Math.sin(angle) * radius
          );
        }
        ctx.closePath();
        ctx.fillStyle = '#ff00ff'; // Magenta
        break;
      case EnemyType.BOSS:
        // Draw main body
        ctx.beginPath();
        ctx.arc(0, 0, enemy.width / 2, 0, Math.PI * 2);
        ctx.fillStyle = '#ff0000'; // Red
        ctx.fill();

        // Draw "wings"
        ctx.beginPath();
        ctx.moveTo(-enemy.width / 2, 0);
        ctx.lineTo(-enemy.width, -enemy.height / 3);
        ctx.lineTo(-enemy.width, enemy.height / 3);
        ctx.closePath();
        ctx.moveTo(enemy.width / 2, 0);
        ctx.lineTo(enemy.width, -enemy.height / 3);
        ctx.lineTo(enemy.width, enemy.height / 3);
        ctx.closePath();
        ctx.fillStyle = '#800000'; // Dark red
        break;
    }

    ctx.fill();

    // Health bar
    const healthBarWidth = enemy.width;
    const healthBarHeight = 4;
    const healthPercentage = enemy.health / enemy.maxHealth;

    ctx.fillStyle = '#ff0000';
    ctx.fillRect(-healthBarWidth / 2, -enemy.height / 2 - 10, healthBarWidth, healthBarHeight);
    ctx.fillStyle = '#00ff00';
    ctx.fillRect(-healthBarWidth / 2, -enemy.height / 2 - 10, healthBarWidth * healthPercentage, healthBarHeight);

    ctx.restore();
  }

  private renderProjectile(projectile: Projectile): void {
    this.ctx.fillStyle = projectile.type === 'player' ? '#FFEB3B' : '#FF9800';
    this.ctx.fillRect(
      projectile.position.x,
      projectile.position.y,
      projectile.width,
      projectile.height
    );
  }

  private renderPowerUp(powerUp: PowerUp): void {
    const colors: Record<PowerUpType, string> = {
      [PowerUpType.HEALTH]: '#4CAF50',
      [PowerUpType.WEAPON]: '#2196F3',
      [PowerUpType.SHIELD]: '#9C27B0',
      [PowerUpType.SPEED]: '#FF9800'
    };

    this.ctx.save();
    this.ctx.fillStyle = colors[powerUp.type];
    this.ctx.strokeStyle = '#FFFFFF';
    this.ctx.lineWidth = 2;

    // Draw power-up as a pulsing circle
    const pulseScale = 1 + Math.sin(Date.now() * 0.005) * 0.2;
    const size = powerUp.width * pulseScale;

    this.ctx.beginPath();
    this.ctx.arc(
      powerUp.position.x + powerUp.width / 2,
      powerUp.position.y + powerUp.height / 2,
      size / 2,
      0,
      Math.PI * 2
    );
    this.ctx.fill();
    this.ctx.stroke();
    this.ctx.restore();
  }

  private renderVisualEffect(effect: VisualEffect): void {
    const ctx = this.ctx;
    if (!ctx) return;

    ctx.save();
    ctx.globalAlpha = effect.opacity;

    const elapsedTime = Date.now() - (effect.startTime || Date.now());
    const progress = Math.min(elapsedTime / effect.duration, 1);

    switch (effect.type) {
      case VisualEffectType.EXPLOSION:
        ctx.beginPath();
        ctx.arc(effect.position.x, effect.position.y, effect.scale * 20, 0, Math.PI * 2);
        ctx.fillStyle = effect.color;
        ctx.fill();
        break;
      case VisualEffectType.POWERUP:
        ctx.beginPath();
        ctx.arc(effect.position.x, effect.position.y, effect.scale * 10, 0, Math.PI * 2);
        ctx.fillStyle = effect.color;
        ctx.fill();
        break;
      case VisualEffectType.HIT:
        ctx.beginPath();
        ctx.arc(effect.position.x, effect.position.y, effect.scale * 5, 0, Math.PI * 2);
        ctx.fillStyle = effect.color;
        ctx.fill();
        break;
      case VisualEffectType.SPAWN:
        const rippleSize = effect.scale * 15 * (1 + progress);
        ctx.beginPath();
        ctx.arc(effect.position.x, effect.position.y, rippleSize, 0, Math.PI * 2);
        ctx.strokeStyle = effect.color;
        ctx.lineWidth = 2 * (1 - progress);
        ctx.stroke();
        break;
      case VisualEffectType.WAVE_COMPLETE:
        const ringSize = effect.scale * 30 * progress;
        ctx.beginPath();
        ctx.arc(effect.position.x, effect.position.y, ringSize, 0, Math.PI * 2);
        ctx.strokeStyle = effect.color;
        ctx.lineWidth = 4 * (1 - progress * 0.5);
        ctx.stroke();

        ctx.fillStyle = effect.color;
        ctx.font = `${Math.floor(effect.scale * 20)}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('WAVE COMPLETE!', effect.position.x, effect.position.y);
        break;
    }

    effect.opacity = 1 - progress;

    ctx.restore();
  }
}
