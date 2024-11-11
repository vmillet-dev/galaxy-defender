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
  isActive: boolean;
}

export interface PlayerShip extends GameObject {
  health: number;
  maxHealth: number;
  weaponLevel: number;
  weaponType: 'laser' | 'missile';
  shieldActive: boolean;
  shieldDuration?: number;
}

export interface Enemy extends GameObject {
  type: 'basic' | 'fast' | 'tank';
  health: number;
  points: number;
  dropChance: number;
  movementPattern: 'linear' | 'zigzag' | 'swooping';
}

export interface Projectile extends GameObject {
  damage: number;
  type: 'player' | 'enemy';
}

export interface PowerUp extends GameObject {
  type: 'health' | 'weapon' | 'shield';
  value: number;
}

export interface Wave {
  number: number;
  enemyTypes: Array<{
    type: Enemy['type'];
    count: number;
    spawnDelay: number;
  }>;
  completed: boolean;
}

export interface GameState {
  player: PlayerShip;
  enemies: Enemy[];
  projectiles: Projectile[];
  powerUps: PowerUp[];
  currentWave: Wave;
  score: number;
  isGameOver: boolean;
  isPaused: boolean;
}
