import type { Dice } from '../logic/Dice';

export type GameMode = 'individual' | 'parejas';
export type SpecialMark = 'mano' | 'huevo';

export interface ScoreOption {
  label: string;
  pts: number | string;
  mark?: SpecialMark;
  alsoGrande?: number;
}

export interface PlayerState {
  name: string;
  teamName: string;
  teamId: number;
  retired: boolean;
  scores: Record<string, number | string | null>;
  grandes: (number | string)[];
  marks: Record<string, SpecialMark | null>;
}

export interface DicePosition {
  x: number;
  y: number;
  r: number;
}

export interface DiceState {
  dice: Dice;
  isSelected: boolean;
  pos: DicePosition;
}

export interface PendingOver {
  playerIdx: number;
  values: number[];
  rolls: number;
  flips: number;
  partnerIdx?: number;
  partnerValues?: number[];
  partnerRolls?: number;
  partnerFlips?: number;
}

export interface PlayerScore {
  balas?: number;
  tontos?: number;
  tricas?: number;
  cuadras?: number;
  quinas?: number;
  senas?: number;
  escalera?: number;
  full?: number;
  poker?: number;
  grande?: number;
  grande1?: number | string;
  grande2?: number | string;
}

export interface Die {
  id: number;
  value: number;
  inCup: boolean;
}

export interface Player {
  name: string;
  scores: Record<string, number | null>;
  totalScore: number;
}

export interface SavedGameState {
  gameMode: GameMode;
  players: PlayerState[];
  currentPlayerIdx: number;
  viewedPlayerIdx: number;
  rollsDone: number;
  flipsDone: number;
  isFlipMode: boolean;
  gameFinished: boolean;
  pendingOver: PendingOver | null;
  dice: Array<{ value: number; isSelected: boolean; pos: DicePosition }>;
}
