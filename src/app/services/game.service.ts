import { Injectable } from '@angular/core';
import { BehaviorSubject, interval, Subject } from 'rxjs';
import { takeWhile } from 'rxjs/operators';
import {
  GameState, PlayerShip, Enemy, Projectile, PowerUp, Wave,
  Position, Velocity, GameObject
} from '../models/game-entities';

@Injectable({
  providedIn: 'root'
})
export class GameService {
  private readonly GAME_TICK = 16; // ~60 FPS
  private readonly CANVAS_WIDTH = 800;
  private readonly CANVAS_HEIGHT = 600;
  private readonly PLAYER_SPEED = 5;

  private gameState = new BehaviorSubject<GameState>({
    player: this.createPlayer(),
    enemies: [],
    projectiles: [],
    powerUps: [],
    currentWave: this.createWave(1),
    score: 0,
    isGameOver: false,
    isPaused: false
  });

  gameState$ = this.gameState.asObservable();
  gameOver$ = new Subject<void>();

  constructor() {}

  private createPlayer(): PlayerShip {
    return {
      position: { x: this.CANVAS_WIDTH / 2, y: this.CANVAS_HEIGHT - 50 },
      velocity: { dx: 0, dy: 0 },
      width: 40,
      height: 40,
      health: 100,
      maxHealth: 100,
      weaponLevel: 1,
      weaponType: 'laser',
      shieldActive: false,
      shieldDuration: 0,
      isActive: true
    };
  }

  private createWave(waveNumber: number): Wave {
    return {
      number: waveNumber,
      enemyTypes: [
        {
          type: 'basic',
          count: Math.floor(3 + waveNumber * 1.5),
          spawnDelay: 1000
        },
        {
          type: 'fast',
          count: Math.floor(waveNumber / 2),
          spawnDelay: 1500
        },
        {
          type: 'tank',
          count: Math.floor(waveNumber / 3),
          spawnDelay: 2000
        }
      ],
      completed: false
    };
  }

  private createEnemy(type: Enemy['type'], position: Position): Enemy {
    const enemyTypes = {
      basic: { health: 20, points: 100, speed: 2, dropChance: 0.2 },
      fast: { health: 10, points: 150, speed: 4, dropChance: 0.3 },
      tank: { health: 40, points: 200, speed: 1, dropChance: 0.4 }
    };

    const enemyType = enemyTypes[type];
    return {
      position,
      velocity: { dx: 0, dy: enemyType.speed },
      width: 30,
      height: 30,
      type,
      health: enemyType.health,
      points: enemyType.points,
      dropChance: enemyType.dropChance,
      movementPattern: Math.random() < 0.3 ? 'zigzag' : 'linear',
      isActive: true
    };
  }

  startGame(): void {
    const initialState = this.gameState.value;
    this.gameState.next({
      ...initialState,
      player: this.createPlayer(),
      enemies: [],
      projectiles: [],
      powerUps: [],
      currentWave: this.createWave(1),
      score: 0,
      isGameOver: false,
      isPaused: false
    });

    this.startGameLoop();
  }

  private startGameLoop(): void {
    interval(this.GAME_TICK)
      .pipe(takeWhile(() => !this.gameState.value.isGameOver))
      .subscribe(() => {
        if (!this.gameState.value.isPaused) {
          this.updateGame();
        }
      });
  }

  private updateGame(): void {
    const currentState = this.gameState.value;
    this.updatePositions(currentState);
    this.checkCollisions(currentState);
    this.spawnEnemies(currentState);
    this.updateWaveStatus(currentState);
    this.gameState.next(currentState);
  }

  private updatePositions(state: GameState): void {
    // Update player position
    state.player.position.x += state.player.velocity.dx;
    state.player.position.y += state.player.velocity.dy;

    // Keep player in bounds
    state.player.position.x = Math.max(0, Math.min(state.player.position.x, this.CANVAS_WIDTH - state.player.width));
    state.player.position.y = Math.max(0, Math.min(state.player.position.y, this.CANVAS_HEIGHT - state.player.height));

    // Update enemies
    state.enemies.forEach(enemy => {
      this.updateEnemyPosition(enemy);
    });

    // Update projectiles
    state.projectiles = state.projectiles.filter(projectile => {
      projectile.position.x += projectile.velocity.dx;
      projectile.position.y += projectile.velocity.dy;
      return this.isInBounds(projectile.position);
    });

    // Update power-ups
    state.powerUps = state.powerUps.filter(powerUp => {
      powerUp.position.y += powerUp.velocity.dy;
      return this.isInBounds(powerUp.position);
    });
  }

  private updateEnemyPosition(enemy: Enemy): void {
    const baseSpeed = enemy.velocity.dy;
    const time = Date.now() / 1000;

    switch (enemy.movementPattern) {
      case 'zigzag':
        enemy.velocity.dx = Math.sin(time) * 2;
        break;
      case 'swooping':
        enemy.velocity.dx = Math.cos(time) * 3;
        enemy.velocity.dy = baseSpeed + Math.sin(time) * 2;
        break;
      default:
        enemy.velocity.dx = 0;
    }

    enemy.position.x += enemy.velocity.dx;
    enemy.position.y += enemy.velocity.dy;

    // Keep enemy in bounds horizontally
    enemy.position.x = Math.max(0, Math.min(enemy.position.x, this.CANVAS_WIDTH - enemy.width));
  }

  private isInBounds(position: Position): boolean {
    return position.x >= 0 &&
           position.x <= this.CANVAS_WIDTH &&
           position.y >= 0 &&
           position.y <= this.CANVAS_HEIGHT;
  }

  private checkCollisions(state: GameState): void {
    // Player projectiles hitting enemies
    state.projectiles
      .filter(p => p.type === 'player' && p.isActive)
      .forEach(projectile => {
        state.enemies.forEach(enemy => {
          if (enemy.isActive && this.detectCollision(projectile, enemy)) {
            projectile.isActive = false;
            enemy.health -= projectile.damage;

            if (enemy.health <= 0) {
              enemy.isActive = false;
              state.score += enemy.points;

              if (Math.random() < enemy.dropChance) {
                state.powerUps.push(this.createPowerUp(enemy.position));
              }
            }
          }
        });
      });

    // Enemy projectiles hitting player
    state.projectiles
      .filter(p => p.type === 'enemy' && p.isActive)
      .forEach(projectile => {
        if (this.detectCollision(projectile, state.player)) {
          projectile.isActive = false;
          if (!state.player.shieldActive) {
            state.player.health -= projectile.damage;

            if (state.player.health <= 0) {
              state.isGameOver = true;
              this.gameOver$.next();
            }
          }
        }
      });

    // Power-up collection
    state.powerUps.forEach(powerUp => {
      if (powerUp.isActive && this.detectCollision(powerUp, state.player)) {
        powerUp.isActive = false;
        this.applyPowerUp(state.player, powerUp);
      }
    });

    // Clean up inactive entities
    state.projectiles = state.projectiles.filter(p => p.isActive);
    state.enemies = state.enemies.filter(e => e.isActive);
    state.powerUps = state.powerUps.filter(p => p.isActive);
  }

  private spawnEnemies(state: GameState): void {
    const wave = state.currentWave;
    wave.enemyTypes.forEach(enemyType => {
      if (enemyType.count > 0 && Date.now() % enemyType.spawnDelay === 0) {
        const position = {
          x: Math.random() * (this.CANVAS_WIDTH - 30),
          y: -30
        };
        state.enemies.push(this.createEnemy(enemyType.type, position));
        enemyType.count--;
      }
    });

    if (wave.enemyTypes.every(et => et.count === 0) && state.enemies.length === 0) {
      wave.completed = true;
    }
  }

  private updateWaveStatus(state: GameState): void {
    if (state.currentWave.completed) {
      state.player.health = Math.min(
        state.player.health + 25,
        state.player.maxHealth
      );
      state.currentWave = this.createWave(state.currentWave.number + 1);
    }
  }

  movePlayer(direction: 'up' | 'down' | 'left' | 'right'): void {
    const state = this.gameState.value;
    const velocity: Velocity = { dx: 0, dy: 0 };
    const speed = 5;

    switch (direction) {
      case 'up':
        velocity.dy = -speed;
        break;
      case 'down':
        velocity.dy = speed;
        break;
      case 'left':
        velocity.dx = -speed;
        break;
      case 'right':
        velocity.dx = speed;
        break;
    }

    state.player.velocity = velocity;
    this.gameState.next(state);
  }

  stopPlayerMovement(): void {
    const state = this.gameState.value;
    state.player.velocity = { dx: 0, dy: 0 };
    this.gameState.next(state);
  }

  fireWeapon(): void {
    const state = this.gameState.value;
    const player = state.player;

    const baseProjectile: Projectile = {
      position: {
        x: player.position.x + player.width / 2 - 2,
        y: player.position.y
      },
      velocity: { dx: 0, dy: -8 },
      width: 4,
      height: 12,
      damage: 10,
      type: 'player',
      isActive: true
    };

    const projectiles: Projectile[] = [];

    switch (player.weaponLevel) {
      case 1:
        projectiles.push({ ...baseProjectile });
        break;
      case 2:
        projectiles.push(
          { ...baseProjectile, position: { ...baseProjectile.position, x: baseProjectile.position.x - 8 } },
          { ...baseProjectile, position: { ...baseProjectile.position, x: baseProjectile.position.x + 8 } }
        );
        break;
      case 3:
        projectiles.push(
          { ...baseProjectile },
          { ...baseProjectile, position: { ...baseProjectile.position, x: baseProjectile.position.x - 12 }, velocity: { dx: -2, dy: -8 } },
          { ...baseProjectile, position: { ...baseProjectile.position, x: baseProjectile.position.x + 12 }, velocity: { dx: 2, dy: -8 } }
        );
        break;
    }

    state.projectiles.push(...projectiles);
    this.gameState.next(state);
  }

  pauseGame(): void {
    const state = this.gameState.value;
    state.isPaused = !state.isPaused;
    this.gameState.next(state);
  }

  private detectCollision(a: GameObject, b: GameObject): boolean {
    return (
      a.position.x < b.position.x + b.width &&
      a.position.x + a.width > b.position.x &&
      a.position.y < b.position.y + b.height &&
      a.position.y + a.height > b.position.y
    );
  }

  private createPowerUp(position: Position): PowerUp {
    const types: PowerUp['type'][] = ['health', 'weapon', 'shield'];
    const type = types[Math.floor(Math.random() * types.length)];
    const values = {
      health: 25,
      weapon: 1,
      shield: 5000 // Shield duration in milliseconds
    };

    return {
      position: { ...position },
      velocity: { dx: 0, dy: 1 },
      width: 20,
      height: 20,
      type,
      value: values[type],
      isActive: true
    };
  }

  private applyPowerUp(player: PlayerShip, powerUp: PowerUp): void {
    switch (powerUp.type) {
      case 'health':
        player.health = Math.min(player.health + powerUp.value, player.maxHealth);
        break;
      case 'weapon':
        player.weaponLevel = Math.min(player.weaponLevel + powerUp.value, 3);
        break;
      case 'shield':
        player.shieldActive = true;
        setTimeout(() => {
          const currentState = this.gameState.value;
          currentState.player.shieldActive = false;
          this.gameState.next(currentState);
        }, powerUp.value);
        break;
    }
  }
}
