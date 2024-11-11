import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GameService } from '../../services/game.service';
import { InputService } from '../../services/input.service';
import { Subscription } from 'rxjs';
import { Enemy, PlayerShip, PowerUp, Projectile, GameState } from '../../models/game-entities';

@Component({
  selector: 'app-game-board',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './game-board.component.html',
  styleUrls: ['./game-board.component.scss']
})
export class GameBoardComponent implements OnInit, OnDestroy {
  @ViewChild('gameCanvas', { static: true }) canvasRef!: ElementRef<HTMLCanvasElement>;
  private ctx!: CanvasRenderingContext2D;
  private gameStateSubscription?: Subscription;
  private animationFrameId?: number;

  // Make these public for template access
  public readonly CANVAS_WIDTH = 800;
  public readonly CANVAS_HEIGHT = 600;
  public canvasWidth = this.CANVAS_WIDTH;
  public canvasHeight = this.CANVAS_HEIGHT;
  public isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

  constructor(
    private gameService: GameService,
    private inputService: InputService
  ) {}

  ngOnInit(): void {
    const canvas = this.canvasRef.nativeElement;
    this.ctx = canvas.getContext('2d')!;
    this.setupCanvas();
    this.startGame();
    this.setupInputHandlers();
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
    const canvas = this.canvasRef.nativeElement;
    canvas.width = this.CANVAS_WIDTH;
    canvas.height = this.CANVAS_HEIGHT;

    const resizeCanvas = () => {
      const container = canvas.parentElement!;
      const containerWidth = container.clientWidth;
      const containerHeight = container.clientHeight;
      const scale = Math.min(
        containerWidth / this.CANVAS_WIDTH,
        containerHeight / this.CANVAS_HEIGHT
      );

      canvas.style.width = `${this.CANVAS_WIDTH * scale}px`;
      canvas.style.height = `${this.CANVAS_HEIGHT * scale}px`;

      // Update canvas dimensions for template binding
      this.canvasWidth = this.CANVAS_WIDTH;
      this.canvasHeight = this.CANVAS_HEIGHT;
    };

    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();
  }

  // Make startGame public for template access
  public startGame(): void {
    this.gameService.startGame();
    this.gameStateSubscription = this.gameService.gameState$.subscribe(gameState => {
      this.render(gameState);
    });
  }

  private setupInputHandlers(): void {
    // Handle keyboard controls directly in component
    window.addEventListener('keydown', (event: KeyboardEvent) => {
      this.handleKeyboardInput(event.key, true);
    });
    window.addEventListener('keyup', (event: KeyboardEvent) => {
      this.handleKeyboardInput(event.key, false);
    });
  }

  // Add touch control methods for template
  public handleDirectionalTouch(direction: 'up' | 'down' | 'left' | 'right' | 'none'): void {
    if (direction === 'none') {
      this.gameService.stopPlayerMovement();
    } else {
      this.gameService.movePlayer(direction);
    }
  }

  public handleFireTouch(): void {
    this.gameService.fireWeapon();
  }

  private handleKeyboardInput(key: string, isKeyDown: boolean): void {
    const keyActions: { [key: string]: () => void } = {
      'ArrowUp': () => this.handleDirectionalTouch(isKeyDown ? 'up' : 'none'),
      'ArrowDown': () => this.handleDirectionalTouch(isKeyDown ? 'down' : 'none'),
      'ArrowLeft': () => this.handleDirectionalTouch(isKeyDown ? 'left' : 'none'),
      'ArrowRight': () => this.handleDirectionalTouch(isKeyDown ? 'right' : 'none'),
      ' ': () => isKeyDown && this.handleFireTouch()
    };

    const action = keyActions[key];
    if (action) {
      action();
    }
  }

  private render(gameState: GameState): void {
    this.ctx.clearRect(0, 0, this.CANVAS_WIDTH, this.CANVAS_HEIGHT);

    // Render player
    this.renderPlayer(gameState.player);

    // Render enemies
    gameState.enemies.forEach((enemy: Enemy) => this.renderEnemy(enemy));

    // Render projectiles
    gameState.projectiles.forEach((projectile: Projectile) => this.renderProjectile(projectile));

    // Render power-ups
    gameState.powerUps.forEach((powerUp: PowerUp) => this.renderPowerUp(powerUp));
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
    this.ctx.fillStyle = '#F44336';
    this.ctx.fillRect(
      enemy.position.x,
      enemy.position.y,
      enemy.width,
      enemy.height
    );
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
    const colors = {
      health: '#4CAF50',
      weapon: '#9C27B0',
      shield: '#00BCD4'
    };

    this.ctx.fillStyle = colors[powerUp.type];
    this.ctx.fillRect(
      powerUp.position.x,
      powerUp.position.y,
      powerUp.width,
      powerUp.height
    );
  }
}
