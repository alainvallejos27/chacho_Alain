import { CupAnimation } from '../components/CupAnimation';

export interface Die {
  id: number;
  value: number;
  inCup: boolean; // True si entra al cacho para volverse a tirar
}

export interface Player {
  name: string;
  scores: Record<string, number | null>;
  totalScore: number;
}

export class GameState {
  public players: Player[] = [];
  public currentPlayerIndex: number = 0;
  public dice: Die[] = [];
  public currentRoll: number = 0;
  public maxRolls: number = 3;
  private cupAnim: CupAnimation;

  constructor() {
    this.cupAnim = new CupAnimation();
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

  // Generador 100% al azar (Sin patrones, totalmente a la suerte)
  private getRandomDiceValue(): number {
    const array = new Uint32Array(1);
    window.crypto.getRandomValues(array);
    return (array[0] % 6) + 1;
  }

  public roll(): void {
    if (this.currentRoll >= this.maxRolls) return;

    this.cupAnim.moveToCenter();

    setTimeout(() => {
      this.currentRoll++;
      
      this.dice.forEach(die => {
        // En el tiro 1 tiran todos, en los siguientes solo los seleccionados (inCup)
        if (this.currentRoll === 1 || die.inCup) {
          die.value = this.getRandomDiceValue();
          die.inCup = false;
        }
      });

      // El cacho se despeja a la esquina inmediatamente
      this.cupAnim.moveToCorner();
    }, 350);
  }

  public toggleDieSelection(index: number): void {
    if (this.currentRoll > 0 && this.currentRoll < this.maxRolls) {
      this.dice[index].inCup = !this.dice[index].inCup;
    }
  }

  // Calcula las opciones de puntaje sugeridas para el jugador actual
  public calculateOptions(): Record<string, number> {
    const values = this.dice.map(d => d.value).sort((a, b) => a - b);
    const counts: Record<number, number> = {};
    values.forEach(v => counts[v] = (counts[v] || 0) + 1);

    const isHand = this.currentRoll === 1;
    const countsArr = Object.values(counts);

    const isFull = countsArr.includes(3) && countsArr.includes(2);
    const isPoker = countsArr.includes(4);
    const isGrande = countsArr.includes(5);
    const str = values.join('');
    const isEscalera = str === '12345' || str === '23456' || str === '13456';

    return {
      balas: (counts[1] || 0) * 1,
      tontos: (counts[2] || 0) * 2,
      tricas: (counts[3] || 0) * 3,
      cuadras: (counts[4] || 0) * 4,
      quinas: (counts[5] || 0) * 5,
      senas: (counts[6] || 0) * 6,
      escalera: isEscalera ? (isHand ? 25 : 20) : 0,
      full: isFull ? (isHand ? 35 : 30) : 0,
      poker: isPoker ? (isHand ? 45 : 40) : 0,
      grande: isGrande ? (isHand ? 50 : 50) : 0 // Si es de mano es Dormida
    };
  }
}