import { initializeGameController } from './GameController';
import { gameMarkup, updateBannerMarkup } from './gameMarkup';
import type { View } from '../View';

export class GameView implements View {
  private container: HTMLElement | null = null;
  private disposeController: (() => void) | null = null;

  render(): string {
    return `${updateBannerMarkup}${gameMarkup}`;
  }

  mount(container: HTMLElement): void {
    this.container = container;
    container.insertAdjacentHTML('beforeend', this.render());
    this.disposeController = initializeGameController();
  }

  unmount(): void {
    this.disposeController?.();
    this.disposeController = null;
    this.container?.querySelector('#update-banner')?.remove();
    this.container?.querySelector('#view-game')?.remove();
    this.container = null;
  }
}
