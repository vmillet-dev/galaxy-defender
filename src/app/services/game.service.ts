import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, interval, Subscription } from 'rxjs';
import { Direction, EnemyType, MovementPattern, PowerUpType, VisualEffectType, WeaponType } from '../models/game-types';
import { Enemy, GameState, PlayerShip, Position, PowerUp, Projectile, VisualEffect, GameObject } from '../models/game-entities';

@Injectable({
  providedIn: 'root'
})
export class GameService implements OnDestroy {
  public gameState$ = new BehaviorSubject<GameState>({
    player: {
      position: { x: window.innerWidth / 2, y: window.innerHeight - 100 },
      velocity: { dx: 0, dy: 0 },
      width: 40,
      height: 40,
      color: '#00ff00',
      isActive: true,
      health: 100,
      maxHealth: 100,
      weaponLevel: 1,
      weaponType: WeaponType.LASER,
      shieldActive: false,
      speedBoost: 1
    } as PlayerShip,
    enemies: [],
    projectiles: [],
    powerUps: [],
    visualEffects: [],
    score: 0,
    wave: 1,
    gameOver: false,
    isPaused: false,
    currentWave: {
      number: 1,
      enemyTypes: [],
      completed: false
    }
  });

  private gameLoopSubscription: Subscription | null = null;
  private canvasWidth: number = window.innerWidth;
  private canvasHeight: number = window.innerHeight;

  constructor() {
    window.addEventListener('resize', () => this.updateCanvasDimensions());
    this.updateCanvasDimensions();
  }

  private updateCanvasDimensions(): void {
    const canvas = document.querySelector('canvas');
    if (canvas) {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      this.canvasWidth = window.innerWidth;
      this.canvasHeight = window.innerHeight;
    }
  }

  private createEnemy(type: EnemyType, position: Position): Enemy {
    const enemyTypes = {
      [EnemyType.BASIC]: {
        width: 20,
        height: 40,
        health: 100,
        speed: 2,
        color: '#00ff00',
        points: 10,
        dropChance: 0.2,
        spawnDelay: 1000
      },
      [EnemyType.FAST]: {
        width: 15,
        height: 30,
        health: 75,
        speed: 4,
        color: '#00ffff',
        points: 20,
        dropChance: 0.3,
        spawnDelay: 800
      },
      [EnemyType.TANK]: {
        width: 30,
        height: 45,
        health: 200,
        speed: 1,
        color: '#ff9900',
        points: 30,
        dropChance: 0.4,
        spawnDelay: 1500
      },
      [EnemyType.ELITE]: {
        width: 25,
        height: 50,
        health: 150,
        speed: 3,
        color: '#ff00ff',
        points: 40,
        dropChance: 0.6,
        spawnDelay: 2000
      },
      [EnemyType.BOSS]: {
        width: 60,
        height: 80,
        health: 500,
        speed: 1.5,
        color: '#ff0000',
        points: 100,
        dropChance: 1.0,
        spawnDelay: 5000
      }
    };

    const config = enemyTypes[type];
    return {
      type,
      position,
      velocity: { dx: 0, dy: 0 },
      width: config.width,
      height: config.height,
      health: config.health,
      maxHealth: config.health,
      speed: config.speed,
      color: config.color,
      points: config.points,
      dropChance: config.dropChance,
      isActive: true,
      movementPattern: this.getMovementPattern(type),
      spawnDelay: config.spawnDelay
    };
  }

  private getMovementPattern(type: EnemyType): MovementPattern {
    switch (type) {
      case EnemyType.BASIC:
        return MovementPattern.LINEAR;
      case EnemyType.FAST:
        return MovementPattern.SINE;
      case EnemyType.TANK:
        return MovementPattern.LINEAR;
      case EnemyType.ELITE:
        return MovementPattern.SWOOP;
      case EnemyType.BOSS:
        return MovementPattern.TRACKING;
      default:
        return MovementPattern.LINEAR;
    }
  }

  startGame(): void {
    this.updateCanvasDimensions();
    const state = this.gameState$.value;
    state.player.position = {
      x: this.canvasWidth / 2,
      y: this.canvasHeight - 100
    };
    state.player.velocity = { dx: 0, dy: 0 };
    state.player.health = state.player.maxHealth;
    state.player.weaponLevel = 1;
    state.player.shieldActive = false;
    state.player.speedBoost = 1;

    state.gameOver = false;
    state.isPaused = false;
    state.score = 0;
    state.wave = 1;
    state.enemies = [];
    state.projectiles = [];
    state.powerUps = [];
    state.visualEffects = [];
    this.gameState$.next(state);
    this.startGameLoop();
  }

  startGameLoop(): void {
    if (this.gameLoopSubscription) {
      this.gameLoopSubscription.unsubscribe();
    }

    this.gameLoopSubscription = interval(16).subscribe(() => {
      const state = this.gameState$.value;
      if (!state.gameOver && !state.isPaused) {
        this.updateGame();
      }
    });
  }

  private updateGame(): void {
    const state = this.gameState$.value;
    this.updatePositions();
    this.spawnEnemies();
    this.checkCollisions(state);
    this.updateWaveStatus();
  }
  private updatePositions(): void {
    const state = this.gameState$.value;

    // Update player position based on current velocity
    if (state.player.velocity.dx !== 0 || state.player.velocity.dy !== 0) {
      const newX = state.player.position.x + state.player.velocity.dx;
      const newY = state.player.position.y + state.player.velocity.dy;

      // Keep player within bounds
      state.player.position.x = Math.max(
        state.player.width / 2,
        Math.min(newX, this.canvasWidth - state.player.width / 2)
      );
      state.player.position.y = Math.max(
        state.player.height / 2,
        Math.min(newY, this.canvasHeight - state.player.height / 2)
      );
    }

    state.enemies.forEach(enemy => this.updateEnemyPosition(enemy));

    state.projectiles.forEach(projectile => {
      projectile.position.x += projectile.velocity.dx;
      projectile.position.y += projectile.velocity.dy;
    });

    state.powerUps.forEach(powerUp => {
      powerUp.position.y += 1;
    });

    state.visualEffects = state.visualEffects.filter(effect => {
      effect.opacity -= 0.02;
      effect.scale += 0.05;
      return effect.opacity > 0;
    });

    this.gameState$.next(state);
  }

  private updateEnemyPosition(enemy: Enemy): void {
    const state = this.gameState$.value;
    const baseSpeed = enemy.speed || 2;

    switch (enemy.movementPattern) {
      case MovementPattern.SINE:
        enemy.position.x += Math.sin(Date.now() / 500) * 2;
        enemy.position.y += baseSpeed;
        break;
      case MovementPattern.TRACKING:
        const dx = state.player.position.x - enemy.position.x;
        const dy = state.player.position.y - enemy.position.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance > 0) {
          enemy.position.x += (dx / distance) * baseSpeed;
          enemy.position.y += (dy / distance) * baseSpeed;
        }
        break;
      case MovementPattern.SWOOP:
        const time = Date.now() / 1000;
        enemy.position.x += Math.sin(time) * 4;
        enemy.position.y += Math.cos(time) * 2 + baseSpeed;
        break;
      case MovementPattern.LINEAR:
      default:
        enemy.position.y += baseSpeed;
        break;
    }

    enemy.position.x = Math.max(-100, Math.min(enemy.position.x, this.canvasWidth + 100));
    enemy.position.y = Math.max(-100, Math.min(enemy.position.y, this.canvasHeight + 100));
  }

  private createWave(): void {
    const state = this.gameState$.value;
    const waveNumber = state.wave;

    // Define enemy types for the wave with guaranteed variety
    const enemyTypes = [
      { type: EnemyType.BASIC, count: Math.max(3, Math.floor(waveNumber * 1.5)), spawnDelay: 1000, totalSpawned: 0 },
      { type: EnemyType.FAST, count: Math.max(1, Math.floor(waveNumber * 0.5)), spawnDelay: 800, totalSpawned: 0 }
    ];

    // Add TANK enemies from wave 2
    if (waveNumber >= 2) {
      enemyTypes.push({ type: EnemyType.TANK, count: Math.max(1, Math.floor(waveNumber * 0.3)), spawnDelay: 1500, totalSpawned: 0 });
    }

    // Add ELITE enemies from wave 3
    if (waveNumber >= 3) {
      enemyTypes.push({ type: EnemyType.ELITE, count: Math.max(1, Math.floor(waveNumber * 0.2)), spawnDelay: 2000, totalSpawned: 0 });
    }

    // Add BOSS every 5 waves
    if (waveNumber % 5 === 0) {
      enemyTypes.push({ type: EnemyType.BOSS, count: 1, spawnDelay: 5000, totalSpawned: 0 });
    }

    state.currentWave = {
      number: waveNumber,
      enemyTypes: enemyTypes,
      completed: false
    };

    this.gameState$.next(state);
  }

  private checkCollisions(state: GameState): void {
    state.enemies.forEach(enemy => {
      if (this.detectCollision(state.player, enemy)) {
        state.player.health -= 10;
        enemy.health = 0;
        this.addVisualEffect(VisualEffectType.EXPLOSION, enemy.position);
        if (state.player.health <= 0) {
          state.gameOver = true;
        }
      }
    });

    state.projectiles.forEach(projectile => {
      state.enemies.forEach(enemy => {
        if (this.detectCollision(projectile, enemy)) {
          enemy.health -= 20;
          projectile.isActive = false;
          this.addVisualEffect(VisualEffectType.HIT, enemy.position);

          if (enemy.health <= 0) {
            state.score += enemy.points;
            if (Math.random() < enemy.dropChance) {
              state.powerUps.push(this.createPowerUp(enemy.position));
            }
            this.addVisualEffect(VisualEffectType.EXPLOSION, enemy.position);
          }
        }
      });
    });

    state.powerUps.forEach(powerUp => {
      if (this.detectCollision(state.player, powerUp)) {
        this.applyPowerUp(powerUp);
        powerUp.isActive = false;
        this.addVisualEffect(VisualEffectType.POWERUP, powerUp.position);
      }
    });

    state.enemies = state.enemies.filter(enemy => enemy.health > 0);
    state.projectiles = state.projectiles.filter(proj => proj.isActive && this.isInBounds(proj));
    state.powerUps = state.powerUps.filter(powerUp => powerUp.isActive && this.isInBounds(powerUp));
  }

  private spawnEnemies(): void {
    const state = this.gameState$.value;
    if (!state.currentWave || state.currentWave.completed) {
      return;
    }

    const currentTime = Date.now();
    state.currentWave.enemyTypes.forEach(config => {
      if (typeof config.totalSpawned === 'undefined') {
        config.totalSpawned = 0;
      }

      const lastSpawnTime = config.lastSpawnTime || 0;
      if (currentTime - lastSpawnTime >= config.spawnDelay) {
        if (config.totalSpawned < config.count) {
          let position = {
            x: Math.random() * (this.canvasWidth - 60) + 30,
            y: -50
          };

          switch (config.type) {
            case EnemyType.FAST:
              position = {
                x: Math.random() < 0.5 ? -30 : this.canvasWidth + 30,
                y: Math.random() * (this.canvasHeight - 100) + 50
              };
              break;
            case EnemyType.TANK:
              position = {
                x: Math.random() * (this.canvasWidth - 100) + 50,
                y: -80
              };
              break;
            case EnemyType.ELITE:
              const edge = Math.floor(Math.random() * 4);
              switch (edge) {
                case 0:
                  position = { x: Math.random() * this.canvasWidth, y: -30 };
                  break;
                case 1:
                  position = { x: this.canvasWidth + 30, y: Math.random() * this.canvasHeight };
                  break;
                case 2:
                  position = { x: Math.random() * this.canvasWidth, y: this.canvasHeight + 30 };
                  break;
                case 3:
                  position = { x: -30, y: Math.random() * this.canvasHeight };
                  break;
              }
              break;
            case EnemyType.BOSS:
              position = {
                x: this.canvasWidth / 2,
                y: -100
              };
              break;
          }

          const enemy = this.createEnemy(config.type, position);
          state.enemies.push(enemy);
          config.lastSpawnTime = currentTime;
          config.totalSpawned++;

          console.log(`Spawning enemy: ${config.type} at position:`, position);
          this.addVisualEffect(VisualEffectType.SPAWN, position);
        }
      }
    });

    this.gameState$.next(state);
  }

  private detectCollision(a: GameObject, b: GameObject): boolean {
    const isEnemy = (obj: GameObject) => 'type' in obj && (obj as Enemy).type !== undefined;
    const buffer = (isEnemy(a) || isEnemy(b)) ? 15 : 0;

    return (
      a.position.x < b.position.x + b.width + buffer &&
      a.position.x + a.width > b.position.x - buffer &&
      a.position.y < b.position.y + b.height + buffer &&
      a.position.y + a.height > b.position.y - buffer
    );
  }

  private isInBounds(obj: GameObject): boolean {
    return (
      obj.position.x >= -100 &&
      obj.position.x <= this.canvasWidth + 100 &&
      obj.position.y >= -100 &&
      obj.position.y <= this.canvasHeight + 100
    );
  }

  private createPowerUp(position: Position): PowerUp {
    const powerUpTypes = [
      { type: PowerUpType.HEALTH, color: '#ff4444', value: 30, duration: 0 },
      { type: PowerUpType.SHIELD, color: '#4444ff', value: 1, duration: 10000 },
      { type: PowerUpType.WEAPON, color: '#44ff44', value: 1, duration: 15000 },
      { type: PowerUpType.SPEED, color: '#ffff44', value: 1.5, duration: 8000 }
    ];

    const powerUpConfig = powerUpTypes[Math.floor(Math.random() * powerUpTypes.length)];

    return {
      type: powerUpConfig.type,
      position: { ...position },
      velocity: { dx: 0, dy: 0 },
      width: 20,
      height: 20,
      color: powerUpConfig.color,
      value: powerUpConfig.value,
      duration: powerUpConfig.duration,
      isActive: true
    };
  }

  private applyPowerUp(powerUp: PowerUp): void {
    const state = this.gameState$.value;

    switch (powerUp.type) {
      case PowerUpType.HEALTH:
        state.player.health = Math.min(state.player.health + powerUp.value, state.player.maxHealth);
        break;
      case PowerUpType.SHIELD:
        state.player.shieldActive = true;
        setTimeout(() => {
          const currentState = this.gameState$.value;
          currentState.player.shieldActive = false;
          this.gameState$.next(currentState);
        }, powerUp.duration);
        break;
      case PowerUpType.WEAPON:
        state.player.weaponLevel = Math.min(state.player.weaponLevel + 1, 3);
        setTimeout(() => {
          const currentState = this.gameState$.value;
          currentState.player.weaponLevel = Math.max(1, currentState.player.weaponLevel - 1);
          this.gameState$.next(currentState);
        }, powerUp.duration);
        break;
      case PowerUpType.SPEED:
        state.player.speedBoost = powerUp.value;
        setTimeout(() => {
          const currentState = this.gameState$.value;
          currentState.player.speedBoost = 1;
          this.gameState$.next(currentState);
        }, powerUp.duration);
        break;
    }

    this.addVisualEffect(VisualEffectType.POWERUP, powerUp.position);
  }

  private addVisualEffect(type: VisualEffectType, position: Position): void {
    const effect: VisualEffect = {
      type,
      position: { ...position },
      startTime: Date.now(),
      duration: type === VisualEffectType.WAVE_COMPLETE ? 2000 : 500,
      color: type === VisualEffectType.EXPLOSION ? '#ff4444' :
             type === VisualEffectType.POWERUP ? '#44ff44' :
             type === VisualEffectType.HIT ? '#ffff44' :
             type === VisualEffectType.SPAWN ? '#88ffff' :
             type === VisualEffectType.WAVE_COMPLETE ? '#ffaa00' : '#ffffff',
      scale: type === VisualEffectType.EXPLOSION ? 2 :
             type === VisualEffectType.WAVE_COMPLETE ? 4 :
             type === VisualEffectType.SPAWN ? 1.5 : 1,
      opacity: 1
    };

    const state = this.gameState$.value;
    state.visualEffects.push(effect);
    this.gameState$.next(state);
  }

  movePlayer(direction: Direction): void {
    const state = this.gameState$.value;
    const speed = 5 * (state.player.speedBoost || 1);

    switch (direction) {
      case Direction.UP:
        state.player.velocity.dy = -speed;
        break;
      case Direction.DOWN:
        state.player.velocity.dy = speed;
        break;
      case Direction.LEFT:
        state.player.velocity.dx = -speed;
        break;
      case Direction.RIGHT:
        state.player.velocity.dx = speed;
        break;
    }

    this.gameState$.next(state);
  }

  updatePlayerPosition(movement: { dx: number; dy: number }): void {
    const state = this.gameState$.value;
    const speed = 5 * (state.player.speedBoost || 1);

    // Update player velocity based on input
    state.player.velocity = {
      dx: movement.dx * speed,
      dy: movement.dy * speed
    };

    // Update player position
    const newX = state.player.position.x + state.player.velocity.dx;
    const newY = state.player.position.y + state.player.velocity.dy;

    // Keep player within bounds
    state.player.position.x = Math.max(
      state.player.width / 2,
      Math.min(newX, this.canvasWidth - state.player.width / 2)
    );
    state.player.position.y = Math.max(
      state.player.height / 2,
      Math.min(newY, this.canvasHeight - state.player.height / 2)
    );

    this.gameState$.next(state);
  }

  fireWeapon(): void {
    const state = this.gameState$.value;
    const projectileSpeed = 10;
    const projectileWidth = 5;
    const projectileHeight = 10;

    const baseProjectile: Projectile = {
      position: {
        x: state.player.position.x + state.player.width / 2 - projectileWidth / 2,
        y: state.player.position.y
      },
      velocity: { dx: 0, dy: -projectileSpeed },
      width: projectileWidth,
      height: projectileHeight,
      damage: 20,
      speed: projectileSpeed,
      type: 'player',
      color: '#00ffff',
      isActive: true
    };

    switch (state.player.weaponLevel) {
      case 1:
        state.projectiles.push({ ...baseProjectile });
        break;
      case 2:
        state.projectiles.push(
          { ...baseProjectile, position: { ...baseProjectile.position, x: baseProjectile.position.x - 10 } },
          { ...baseProjectile, position: { ...baseProjectile.position, x: baseProjectile.position.x + 10 } }
        );
        break;
      case 3:
        state.projectiles.push(
          { ...baseProjectile },
          { ...baseProjectile, position: { ...baseProjectile.position, x: baseProjectile.position.x - 15 }, velocity: { dx: -2, dy: -projectileSpeed } },
          { ...baseProjectile, position: { ...baseProjectile.position, x: baseProjectile.position.x + 15 }, velocity: { dx: 2, dy: -projectileSpeed } }
        );
        break;
    }

    this.gameState$.next(state);
  }

  private updateWaveStatus(): void {
    const state = this.gameState$.value;

    if (state.currentWave && !state.currentWave.completed) {
      const allEnemiesSpawned = state.currentWave.enemyTypes.every(config => {
        if (typeof config.totalSpawned === 'undefined') {
          config.totalSpawned = 0;
        }
        return config.totalSpawned >= config.count;
      });

      const noEnemiesLeft = state.enemies.length === 0;

      if (allEnemiesSpawned && noEnemiesLeft) {
        state.currentWave.completed = true;
        console.log(`Wave ${state.wave} completed! Starting next wave...`);

        const centerPosition = {
          x: this.canvasWidth / 2,
          y: this.canvasHeight / 2
        };
        this.addVisualEffect(VisualEffectType.WAVE_COMPLETE, centerPosition);
      }
    }

    if (!state.currentWave || state.currentWave.completed) {
      state.wave++;
      this.createWave();
      console.log(`Wave ${state.wave} started with config:`,
        state.currentWave?.enemyTypes.map(et => `${et.type}: ${et.count} enemies`)
      );
    }

    this.gameState$.next(state);
  }

  pauseGame(): void {
    const state = this.gameState$.value;
    state.isPaused = !state.isPaused;
    this.gameState$.next(state);
  }

  stopPlayerMovement(): void {
    const state = this.gameState$.value;
    state.player.velocity = { dx: 0, dy: 0 };
    this.gameState$.next(state);
  }

  ngOnDestroy(): void {
    if (this.gameLoopSubscription) {
      this.gameLoopSubscription.unsubscribe();
    }
  }
}
