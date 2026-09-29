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
  grande1?: number | string;
  grande2?: number | string;
}

export class Scoreboard {
  // Evalúa los tiros de dados y devuelve los puntajes disponibles
  public static evaluate(diceValues: number[], isMano: boolean): PlayerScore {
    const counts: { [key: number]: number } = {};
    diceValues.forEach(v => counts[v] = (counts[v] || 0) + 1);

    const freqs = Object.values(counts);
    const sortedStr = [...diceValues].sort((a, b) => a - b).join('');

    const isEscalera = sortedStr === '12345' || sortedStr === '23456' || sortedStr === '13456';
    const isFull = freqs.includes(3) && freqs.includes(2);
    const isPoker = freqs.includes(4) || freqs.includes(5);

    return {
      balas: (counts[1] || 0) * 1,
      tontos: (counts[2] || 0) * 2,
      tricas: (counts[3] || 0) * 3,
      cuadras: (counts[4] || 0) * 4,
      quinas: (counts[5] || 0) * 5,
      senas: (counts[6] || 0) * 6,
      escalera: isEscalera ? (isMano ? 25 : 20) : 0,
      full: isFull ? (isMano ? 35 : 30) : 0,
      poker: isPoker ? (isMano ? 45 : 40) : 0
    };
  }
}