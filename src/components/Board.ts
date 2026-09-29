export class Board {
  private container: HTMLElement;

  constructor(containerId: string) {
    this.container = document.getElementById(containerId)!;
  }

  render(scores: Record<string, number | string>) {
    this.container.innerHTML = `
      <div class="cell" data-key="1">Balas (1): ${scores['1'] ?? ''}</div>
      <div class="cell" data-key="escalera">Escalera: ${scores['escalera'] ?? ''}</div>
      <div class="cell" data-key="4">Cuadras (4): ${scores['4'] ?? ''}</div>
      <div class="cell" data-key="2">Tontos (2): ${scores['2'] ?? ''}</div>
      <div class="cell" data-key="full">Full: ${scores['full'] ?? ''}</div>
      <div class="cell" data-key="5">Quinas (5): ${scores['5'] ?? ''}</div>
      <div class="cell" data-key="3">Tricas (3): ${scores['3'] ?? ''}</div>
      <div class="cell" data-key="poker">Póker: ${scores['poker'] ?? ''}</div>
      <div class="cell" data-key="6">Senas (6): ${scores['6'] ?? ''}</div>
      <div class="cell wide" data-key="grande">Grande: ${scores['grande'] ?? ''}</div>
    `;
  }
}