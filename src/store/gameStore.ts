export class GameStore {
  getRaw(key: string): string | null {
    return localStorage.getItem(key);
  }

  setRaw(key: string, value: string): void {
    localStorage.setItem(key, value);
  }

  remove(key: string): void {
    localStorage.removeItem(key);
  }
}

export const gameStore = new GameStore();
