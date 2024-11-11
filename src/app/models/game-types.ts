export enum Direction {
  UP = 'up',
  DOWN = 'down',
  LEFT = 'left',
  RIGHT = 'right'
}

export enum WeaponType {
  LASER = 'LASER',
  PLASMA = 'PLASMA',
  MISSILE = 'MISSILE'
}

export enum EnemyType {
  BASIC = 'BASIC',
  FAST = 'FAST',
  TANK = 'TANK',
  ELITE = 'ELITE',
  BOSS = 'BOSS'
}

export enum MovementPattern {
  LINEAR = 'LINEAR',
  SINE = 'SINE',
  SWOOP = 'SWOOP',
  TRACKING = 'TRACKING'
}

export enum PowerUpType {
  HEALTH = 'HEALTH',
  WEAPON = 'WEAPON',
  SHIELD = 'SHIELD',
  SPEED = 'SPEED'
}

export enum VisualEffectType {
  EXPLOSION = 'EXPLOSION',
  POWERUP = 'POWERUP',
  HIT = 'HIT',
  SPAWN = 'SPAWN',
  WAVE_COMPLETE = 'WAVE_COMPLETE'
}

export interface Position {
  x: number;
  y: number;
}

export interface Velocity {
  dx: number;
  dy: number;
}

export interface GameObject {
  position: Position;
  velocity: Velocity;
  width: number;
  height: number;
  color: string;
  isActive: boolean;
}

export interface PlayerShip extends GameObject {
  health: number;
  maxHealth: number;
  weaponLevel: number;
  weaponType: WeaponType;
  shieldActive: boolean;
  speedBoost: number;
}

export interface Enemy extends GameObject {
  type: EnemyType;
  health: number;
  maxHealth: number;
  speed: number;
  points: number;
  dropChance: number;
  movementPattern: MovementPattern;
  spawnDelay: number;
}

export interface PowerUp extends GameObject {
  type: PowerUpType;
  value: number;
  duration: number;
}

export interface Projectile extends GameObject {
  damage: number;
  speed: number;
  type: 'player' | 'enemy';
}

export interface VisualEffect {
  type: VisualEffectType;
  position: Position;
  startTime?: number;
  duration: number;
  color: string;
  opacity: number;
  scale: number;
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
  currentWave: {
    number: number;
    enemyTypes: {
      type: EnemyType;
      count: number;
      spawnDelay: number;
      lastSpawnTime?: number;
      totalSpawned: number;
    }[];
    completed: boolean;
  };
}
