import type { UserProfile } from '../../types/user.types';
import type { View } from '../View';

interface LobbyStats {
  wins: number;
  gamesPlayed: number;
  record: number;
}

export class LobbyView implements View {
  private container: HTMLElement | null = null;
  private listeners: AbortController | null = null;

  render(): string {
    const user = this.getUser();
    const stats = this.getStats();
    return `
      <section id="view-lobby" class="flex min-h-0 flex-1 flex-col overflow-y-auto bg-[#0b2027] text-white">
        <header class="flex flex-wrap items-center justify-between gap-4 border-b border-[#f5aa14]/15 px-4 py-4 sm:px-8">
          <a href="#" data-view-target="view-lobby" class="text-sm font-black tracking-[0.14em] text-[#d5e67b] sm:text-base">🎲 CACHO BOLIVIANO PRO</a>
          <div class="flex items-center gap-3">
            <span id="lobby-connection" class="flex items-center gap-2 text-xs font-semibold text-white/65" role="status"><span class="h-2 w-2 rounded-full ${navigator.onLine ? 'bg-emerald-400' : 'bg-[#f26b4f]'}"></span>${navigator.onLine ? 'En línea' : 'Sin conexión'}</span>
            ${user.role === 'admin' ? '<button type="button" data-view-target="view-admin" class="rounded-xl border border-[#f5aa14]/25 bg-black/30 px-3 py-2 text-xs font-bold text-[#f5aa14] transition hover:bg-[#f5aa14]/10">Admin</button>' : ''}
            <button type="button" data-view-target="view-profile" class="flex items-center gap-2 rounded-full border border-[#d5e67b]/20 bg-black/30 py-1.5 pl-1.5 pr-3 text-sm font-bold text-white transition hover:border-[#d5e67b]/50">
              <span class="grid h-8 w-8 place-items-center rounded-full bg-[#14363a] text-base" aria-hidden="true">${this.escape(user.username.slice(0, 1).toUpperCase())}</span>
              <span class="max-w-28 truncate">${this.escape(user.username)}</span>
            </button>
          </div>
        </header>

        <main class="mx-auto flex w-full max-w-6xl flex-1 flex-col justify-center px-4 py-8 sm:px-8 sm:py-12">
          <div class="mb-7">
            <p class="mb-2 text-xs font-extrabold uppercase tracking-[0.24em] text-[#f5aa14]">La mesa está lista</p>
            <h1 class="text-4xl font-black tracking-tight sm:text-5xl">Hola, <span class="text-[#d5e67b]">${this.escape(user.username)}</span></h1>
            <p class="mt-3 max-w-xl text-sm leading-6 text-white/60 sm:text-base">Invita a tus amigos, lanza los dados y busca tu próxima dormida.</p>
          </div>

          <section aria-label="Estadísticas rápidas" class="mb-7 grid grid-cols-1 gap-3 sm:grid-cols-3">
            ${this.statCard('Victorias', stats.wins, '🏆', 'text-[#d5e67b]')}
            ${this.statCard('Partidas jugadas', stats.gamesPlayed, '🎲', 'text-[#f5aa14]')}
            ${this.statCard('Récord personal', stats.record, '⭐', 'text-[#f26b4f]')}
          </section>

          <section aria-label="Acciones de juego" class="grid gap-3 sm:grid-cols-2">
            <button type="button" data-view-target="view-game" data-game-action="local" class="group flex min-h-24 items-center justify-between rounded-2xl border border-[#f5aa14]/30 bg-[#f26b4f] p-5 text-left shadow-lg shadow-black/20 transition hover:-translate-y-0.5 hover:bg-[#e96348] focus:outline-none focus:ring-2 focus:ring-[#d5e67b]">
              <span><span class="block text-lg font-black">Partida Local</span><span class="mt-1 block text-sm text-white/75">Juega en esta mesa o practica</span></span><span class="text-3xl transition group-hover:rotate-12" aria-hidden="true">🎲</span>
            </button>
            <button type="button" data-view-target="view-game" data-game-action="create-room" class="group flex min-h-24 items-center justify-between rounded-2xl border border-[#d5e67b]/25 bg-[#14363a]/75 p-5 text-left backdrop-blur-md transition hover:-translate-y-0.5 hover:border-[#d5e67b]/55 focus:outline-none focus:ring-2 focus:ring-[#f5aa14]">
              <span><span class="block text-lg font-black text-[#d5e67b]">Crear Sala Online</span><span class="mt-1 block text-sm text-white/60">Invita a tus amigos con un código</span></span><span class="text-3xl" aria-hidden="true">🌐</span>
            </button>
            <button id="lobby-open-join" type="button" class="group flex min-h-24 items-center justify-between rounded-2xl border border-[#f5aa14]/20 bg-black/30 p-5 text-left backdrop-blur-md transition hover:-translate-y-0.5 hover:border-[#f5aa14]/50 focus:outline-none focus:ring-2 focus:ring-[#f5aa14]">
              <span><span class="block text-lg font-black">Unirse con Código</span><span class="mt-1 block text-sm text-white/60">Entra a una sala existente</span></span><span class="text-3xl" aria-hidden="true">🔑</span>
            </button>
            <button type="button" data-view-target="view-profile" class="group flex min-h-24 items-center justify-between rounded-2xl border border-white/10 bg-black/30 p-5 text-left backdrop-blur-md transition hover:-translate-y-0.5 hover:border-white/25 focus:outline-none focus:ring-2 focus:ring-[#d5e67b]">
              <span><span class="block text-lg font-black">Mi Perfil</span><span class="mt-1 block text-sm text-white/60">Revisa tus partidas y estadísticas</span></span><span class="text-3xl" aria-hidden="true">👤</span>
            </button>
          </section>

          <form id="lobby-join-form" class="mt-4 hidden max-w-xl rounded-2xl border border-[#f5aa14]/20 bg-black/30 p-4 backdrop-blur-md" novalidate>
            <label for="lobby-room-code" class="mb-2 block text-sm font-bold text-[#d5e67b]">Código de sala</label>
            <div class="flex gap-2">
              <input id="lobby-room-code" name="roomCode" required minlength="4" maxlength="8" autocomplete="off" class="min-w-0 flex-1 rounded-xl border border-white/10 bg-[#14363a] px-4 py-3 font-bold uppercase tracking-widest text-white outline-none focus:border-[#d5e67b]/60" placeholder="ABC123">
              <button type="submit" class="rounded-xl bg-[#f5aa14] px-5 py-3 font-extrabold text-[#0b2027] transition hover:bg-[#e5a00d]">Entrar</button>
            </div>
            <p id="lobby-join-status" class="mt-2 min-h-5 text-sm text-white/65" role="status" aria-live="polite"></p>
          </form>
        </main>
        <footer class="px-4 pb-4 text-center text-xs text-white/35">Cacho Boliviano PRO · Buena suerte y buen juego.</footer>
      </section>`;
  }

  mount(container: HTMLElement): void {
    this.container = container;
    this.listeners = new AbortController();
    container.insertAdjacentHTML('beforeend', this.render());
    const root = container.querySelector<HTMLElement>('#view-lobby')!;
    const signal = this.listeners.signal;

    container.querySelector<HTMLButtonElement>('#lobby-open-join')!.addEventListener('click', () => {
      const form = root.querySelector<HTMLFormElement>('#lobby-join-form')!;
      form.classList.toggle('hidden');
      if (!form.classList.contains('hidden')) root.querySelector<HTMLInputElement>('#lobby-room-code')!.focus();
    }, { signal });

    root.querySelector<HTMLFormElement>('#lobby-join-form')!.addEventListener('submit', event => {
      event.preventDefault();
      const form = event.currentTarget as HTMLFormElement;
      if (!form.reportValidity()) return;
      const code = new FormData(form).get('roomCode')?.toString().trim().toUpperCase();
      if (!code) return;
      root.dispatchEvent(new CustomEvent('cacho:navigate', {
        bubbles: true,
        detail: { viewId: 'view-game', action: 'join-room', roomCode: code }
      }));
    }, { signal });

    window.addEventListener('online', () => this.setConnectionState(true), { signal });
    window.addEventListener('offline', () => this.setConnectionState(false), { signal });
  }

  unmount(): void {
    this.listeners?.abort();
    this.listeners = null;
    this.container?.querySelector('#view-lobby')?.remove();
    this.container = null;
  }

  private setConnectionState(online: boolean): void {
    const status = this.container?.querySelector<HTMLElement>('#lobby-connection');
    if (!status) return;
    status.innerHTML = `<span class="h-2 w-2 rounded-full ${online ? 'bg-emerald-400' : 'bg-[#f26b4f]'}"></span>${online ? 'En línea' : 'Sin conexión'}`;
  }

  private getUser(): UserProfile {
    const fallback: UserProfile = { id: 'guest', username: 'Jugador', gamesPlayed: 0, wins: 0 };
    const raw = localStorage.getItem('cacho-user-profile');
    if (!raw) return fallback;
    try {
      const parsed = JSON.parse(raw) as Partial<UserProfile>;
      if (typeof parsed.username !== 'string' || !parsed.username.trim()) return fallback;
      return { ...fallback, ...parsed, username: parsed.username.trim() };
    } catch (error) {
      console.error('No se pudo leer el perfil guardado.', error);
      return fallback;
    }
  }

  private getStats(): LobbyStats {
    const raw = localStorage.getItem('cacho-player-stats');
    if (!raw) return { wins: 0, gamesPlayed: 0, record: 0 };
    try {
      const stats = JSON.parse(raw) as Partial<LobbyStats>;
      return {
        wins: this.nonNegativeInteger(stats.wins),
        gamesPlayed: this.nonNegativeInteger(stats.gamesPlayed),
        record: this.nonNegativeInteger(stats.record)
      };
    } catch (error) {
      console.error('No se pudieron leer las estadísticas guardadas.', error);
      return { wins: 0, gamesPlayed: 0, record: 0 };
    }
  }

  private nonNegativeInteger(value: unknown): number {
    return typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
  }

  private statCard(label: string, value: number, icon: string, accent: string): string {
    return `<article class="rounded-2xl border border-white/10 bg-black/30 p-4 shadow-lg shadow-black/10 backdrop-blur-md sm:p-5"><div class="flex items-center justify-between"><p class="text-xs font-bold uppercase tracking-wider text-white/55">${label}</p><span aria-hidden="true" class="${accent}">${icon}</span></div><p class="mt-2 text-3xl font-black ${accent}">${value.toLocaleString('es')}</p></article>`;
  }

  private escape(value: string): string {
    return value.replace(/[&<>"']/g, character => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[character]!);
  }
}
