import type { Die, Player, PlayerScore } from '../types/game.types';
import { Scoreboard } from './Scoreboard';

export class GameState {
  public players: Player[] = [];
  public currentPlayerIndex: number = 0;
  public dice: Die[] = [];
  public currentRoll: number = 0;
  public maxRolls: number = 3;

  constructor() {
    this.resetDice();
  }

  public setupPlayers(names: string[]): void {
    this.players = names.map(name => ({
      name,
      scores: {
        balas: null, tontos: null, tricas: null,
        cuadras: null, quinas: null, senas: null,
        escalera: null, full: null, poker: null, grande: null
      },
      totalScore: 0
    }));
    this.currentPlayerIndex = 0;
  }

  public resetDice(): void {
    this.dice = Array.from({ length: 5 }, (_, i) => ({
      id: i,
      value: 1,
      inCup: false
    }));
    this.currentRoll = 0;
  }

  private getRandomDiceValue(): number {
    const array = new Uint32Array(1);
    globalThis.crypto.getRandomValues(array);
    return (array[0] % 6) + 1;
  }

  public roll(): void {
    if (this.currentRoll >= this.maxRolls) return;
    this.currentRoll++;
    this.dice.forEach(die => {
      if (this.currentRoll === 1 || die.inCup) {
        die.value = this.getRandomDiceValue();
        die.inCup = false;
      }
    });
  }

  public toggleDieSelection(index: number): void {
    if (this.currentRoll > 0 && this.currentRoll < this.maxRolls) {
      this.dice[index].inCup = !this.dice[index].inCup;
    }
  }

  public calculateOptions(): PlayerScore {
    return Scoreboard.evaluate(this.dice.map(die => die.value), this.currentRoll === 1);
  }
}