import { AdminView } from './views/admin/AdminView';
import { AuthView } from './views/auth/AuthView';
import { GameView } from './views/game/GameView';
import { LobbyView } from './views/lobby/LobbyView';
import { ProfileView } from './views/profile/ProfileView';
import { ViewRouter, type ViewId } from './router/router';
import type { AuthenticatedUser } from './types/user.types';
import type { View } from './views/View';

export function startApp(): void {
  const app = document.getElementById('app');
  if (!app) throw new Error('No se encontró el contenedor principal #app');

  let router: ViewRouter;
  const views: Record<ViewId, View> = {
    'view-auth': new AuthView(undefined, (user: AuthenticatedUser) => {
      localStorage.setItem('cacho-user-profile', JSON.stringify(user));
      router.show('view-lobby');
    }),
    'view-lobby': new LobbyView(),
    'view-game': new GameView(),
    'view-profile': new ProfileView(),
    'view-admin': new AdminView()
  };
  router = new ViewRouter(app, views);

  window.addEventListener('pagehide', () => router.destroy(), { once: true });
}
