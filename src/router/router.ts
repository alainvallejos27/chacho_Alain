import type { View } from '../views/View';


export type ViewId = 'view-auth' | 'view-lobby' | 'view-game' | 'view-profile' | 'view-admin';
export type GameAction = 'local' | 'create-room' | 'join-room';

interface NavigateDetail {
  viewId: ViewId;
  action?: GameAction;
  roomCode?: string;
}

const viewIds: ViewId[] = ['view-auth', 'view-lobby', 'view-game', 'view-profile', 'view-admin'];

function isViewId(value: unknown): value is ViewId {
  return typeof value === 'string' && viewIds.includes(value as ViewId);
}

export class ViewRouter {
  private activeViewId: ViewId | null = null;
  private activeView: View | null = null;
  private readonly clickHandler: (event: Event) => void;
  private readonly navigateHandler: (event: Event) => void;

  constructor(
    private readonly app: HTMLElement,
    private readonly views: Record<ViewId, View>,
    initialView: ViewId = 'view-lobby'
  ) {
    this.clickHandler = event => this.handleClick(event);
    this.navigateHandler = event => this.handleNavigate(event);
    app.addEventListener('click', this.clickHandler);
    app.addEventListener('cacho:navigate', this.navigateHandler);
    this.show(initialView);
  }

  show(viewId: ViewId, action?: GameAction, roomCode?: string): void {
    if (!isViewId(viewId)) throw new Error(`Vista de navegación desconocida: ${viewId}`);
    if (this.activeViewId === viewId && this.activeView) {
      if (action) this.dispatchGameAction(action, roomCode);
      return;
    }

    this.activeView?.unmount();
    this.activeView = null;
    this.activeViewId = viewId;
    this.app.replaceChildren();
    const nextView = this.views[viewId];
    this.activeView = nextView;
    nextView.mount(this.app);
    const mountedSection = this.app.querySelector<HTMLElement>(`#${viewId}`);
    if (!mountedSection) throw new Error(`La vista #${viewId} no montó su sección raíz.`);
    mountedSection.classList.remove('hidden');
    mountedSection.classList.add('flex');
    mountedSection.setAttribute('aria-hidden', 'false');
    if (action) this.dispatchGameAction(action, roomCode);
  }

  destroy(): void {
    this.app.removeEventListener('click', this.clickHandler);
    this.app.removeEventListener('cacho:navigate', this.navigateHandler);
    this.activeView?.unmount();
    this.activeView = null;
    this.activeViewId = null;
    this.app.replaceChildren();
  }

  private handleClick(event: Event): void {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const button = target.closest<HTMLElement>('[data-view-target]');
    if (!button || !this.app.contains(button)) return;
    const viewId = button.dataset.viewTarget;
    if (!isViewId(viewId)) throw new Error(`Vista de navegación desconocida: ${viewId ?? '(vacía)'}`);
    if (button instanceof HTMLAnchorElement) event.preventDefault();
    const action = this.getGameAction(button.dataset.gameAction);
    this.show(viewId, action);
  }

  private handleNavigate(event: Event): void {
    const detail = (event as CustomEvent<Partial<NavigateDetail>>).detail;
    if (!detail || !isViewId(detail.viewId)) {
      throw new Error('Evento cacho:navigate sin una vista válida.');
    }
    this.show(detail.viewId, this.getGameAction(detail.action), detail.roomCode);
  }

  private getGameAction(value: unknown): GameAction | undefined {
    if (value === undefined) return undefined;
    if (value === 'local' || value === 'create-room' || value === 'join-room') return value;
    throw new Error(`Acción de juego desconocida: ${String(value)}`);
  }

  private dispatchGameAction(action: GameAction, roomCode?: string): void {
    document.dispatchEvent(new CustomEvent('cacho:game:action', { detail: { action, roomCode } }));
  }
}
