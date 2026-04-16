export type GameState = 'platform_selection' | 'selection' | 'playing' | 'gameover' | 'store';

export interface Character {
  id: number;
  image: string;
  name: string;
}

export interface Dress {
  id: number;
  name: string;
  image: string;
  cost: number;
}

export interface Obstacle {
  id: number;
  x: number;
  width: number;
  type: 'bus' | 'gap' | 'coin';
  y?: number; // For coins that might be floating
}

export interface GameSettings {
  gameName: string;
  characters: Character[];
  mafia: Character;
  mafiaDialogue: string;
  difficulty: {
    initialSpeed: number;
    gravity: number;
    jumpForce: number;
    gapMin: number;
    gapMax: number;
  };
  chaos: {
    frequency: number;
    duration: number;
    enabled: boolean;
  };
  audio?: {
    jumpSoundUrl?: string;
    gameOverSoundUrl?: string;
  };
  dresses?: Dress[];
}

export const CHARACTERS: Character[] = [
  { id: 0, image: 'input_file_0.png', name: 'Agent Blue' },
  { id: 1, image: 'input_file_1.png', name: 'Striker' },
  { id: 2, image: 'input_file_2.png', name: 'Hoodie' },
  { id: 3, image: 'input_file_3.png', name: 'Laugher' },
  { id: 4, image: 'input_file_4.png', name: 'Gamer' },
];

export const MAFIA_CHARACTER: Character = {
  id: 5,
  image: 'input_file_5.png',
  name: 'Target Heroine',
};
