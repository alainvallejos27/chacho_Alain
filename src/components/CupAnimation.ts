export class CupAnimation {
  private getCup(): HTMLElement | null {
    return document.getElementById('cacho');
  }

  public moveToCorner(): void {
    const cup = this.getCup();
    if (cup) {
      cup.style.transition = 'transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
      cup.style.transform = 'translate(140px, 120px) rotate(15deg)';
    }
  }

  public moveToCenter(): void {
    const cup = this.getCup();
    if (cup) {
      cup.style.transition = 'transform 0.3s ease-in-out';
      cup.style.transform = 'translate(0px, 0px) rotate(0deg)';
    }
  }
}