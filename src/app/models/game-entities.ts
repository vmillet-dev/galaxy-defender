import { Direction, EnemyType, MovementPattern, PowerUpType, VisualEffectType, WeaponType } from './game-types';

export interface Position {
  x: number;
  y: number;
}

export interface Velocity {
  dx: number;
  dy: number;
}

export interface VisualEffect {
  type: VisualEffectType;
  duration: number;
  color: string;
  opacity: number;
  position: Position;
  velocity?: Velocity;
  scale: number;
  startTime?: number;
}

export interface GameObject {
  position: Position;
  velocity: Velocity;
  width: number;
  height: number;
  color: string;
  isActive: boolean;
  visualEffects?: VisualEffect[];
}

export interface Enemy extends GameObject {
  type: EnemyType;
  health: number;
  maxHealth: number;
  speed: number;
  points: number;
  dropChance: number;
  spawnDelay: number;
  movementPattern: MovementPattern;
  lastTeleportTime?: number;
}

export interface PowerUp extends GameObject {
  type: PowerUpType;
  value: number;
  duration: number;
}

export interface PlayerShip extends GameObject {
  health: number;
  maxHealth: number;
  weaponLevel: number;
  weaponType: WeaponType;
  speedBoost: number;
  speedBoostDuration?: number;
  shieldActive: boolean;
}

export interface Projectile extends GameObject {
  damage: number;
  speed: number;
  type: 'player' | 'enemy';
}

export interface Wave {
  number: number;
  enemyTypes: Array<{
    type: EnemyType;
    count: number;
    spawnDelay: number;
    lastSpawnTime?: number;
    totalSpawned: number;
  }>;
  completed: boolean;
}

export interface GameState {
  player: PlayerShip;
  enemies: Enemy[];
  projectiles: Projectile[];
  powerUps: PowerUp[];
  visualEffects: VisualEffect[];
  score: number;
  wave: number;
  gameOver: boolean;
  isPaused: boolean;
  currentWave: Wave;
}
