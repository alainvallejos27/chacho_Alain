export class Dice {
  public value: number = 1;

  constructor() {
    this.roll();
  }

  public roll(): number {
    const cryptoArray = new Uint32Array(1);
    window.crypto.getRandomValues(cryptoArray);
    this.value = (cryptoArray[0] % 6) + 1;
    return this.value;
  }
}