import type { UserProfile } from '../../types/user.types';
import type { View } from '../View';

interface MatchRecord {
  date: string;
  mode: string;
  result: 'win' | 'loss';
  score: number;
}

interface PlayerHistory {
  gamesPlayed: number;
  wins: number;
  pointsScored: number;
  handDormidas: number;
  matches: MatchRecord[];
}

export class ProfileView implements View {
  private container: HTMLElement | null = null;
  private listeners: AbortController | null = null;

  render(): string {
    const user = this.getUser();
    const history = this.getHistory();
    const winRate = history.gamesPlayed ? Math.round(history.wins / history.gamesPlayed * 100) : 0;
    const average = history.gamesPlayed ? Math.round(history.pointsScored / history.gamesPlayed) : 0;
    const rows = history.matches.map(match => `
      <tr class="border-t border-white/10">
        <td class="whitespace-nowrap px-4 py-3 text-sm text-white/65">${this.escape(this.formatDate(match.date))}</td>
        <td class="px-4 py-3 text-sm">${this.escape(match.mode)}</td>
        <td class="px-4 py-3"><span class="rounded-full px-2.5 py-1 text-xs font-extrabold ${match.result === 'win' ? 'bg-emerald-400/10 text-emerald-300' : 'bg-[#f26b4f]/10 text-[#f26b4f]'}">${match.result === 'win' ? 'Victoria' : 'Derrota'}</span></td>
        <td class="px-4 py-3 text-right text-sm font-bold text-[#f5aa14]">${match.score.toLocaleString('es')}</td>
      </tr>`).join('');

    return `
      <section id="view-profile" class="flex min-h-0 flex-1 flex-col overflow-y-auto bg-[#0b2027] text-white">
        <header class="flex items-center justify-between border-b border-[#f5aa14]/15 px-4 py-4 sm:px-8">
          <button type="button" data-view-target="view-lobby" class="rounded-lg px-2 py-2 text-sm font-bold text-[#d5e67b] hover:bg-white/5">← Lobby</button>
          <h1 class="text-lg font-black text-[#d5e67b]">Mi Perfil</h1>
          <span class="w-14" aria-hidden="true"></span>
        </header>
        <main class="mx-auto w-full max-w-5xl flex-1 px-4 py-7 sm:px-8">
          <section class="flex flex-wrap items-center gap-4 rounded-3xl border border-[#d5e67b]/15 bg-black/30 p-5 backdrop-blur-md sm:p-7">
            <div class="grid h-16 w-16 place-items-center rounded-2xl bg-[#14363a] text-3xl font-black text-[#d5e67b]" aria-hidden="true">${this.escape(user.username.slice(0, 1).toUpperCase())}</div>
            <div class="min-w-0 flex-1"><p class="text-xs font-extrabold uppercase tracking-[0.2em] text-[#f5aa14]">Jugador</p><h2 class="mt-1 truncate text-2xl font-black">${this.escape(user.username)}</h2><p class="mt-1 text-sm text-white/55">${this.escape(user.email ?? 'Perfil local')}</p></div>
            <button id="profile-logout" type="button" class="rounded-xl border border-[#f26b4f]/35 px-4 py-2.5 text-sm font-bold text-[#f26b4f] transition hover:bg-[#f26b4f]/10">Cerrar sesión</button>
          </section>

          <section aria-label="Métricas históricas" class="mt-5 grid gap-3 sm:grid-cols-3">
            ${this.metric('Promedio de puntos', average.toLocaleString('es'), '📈', 'text-[#f5aa14]')}
            ${this.metric('Victorias', `${winRate}%`, '🏆', 'text-[#d5e67b]')}
            ${this.metric('Dormidas de mano', history.handDormidas.toLocaleString('es'), '🎯', 'text-[#f26b4f]')}
          </section>

          <section class="mt-7 overflow-hidden rounded-2xl border border-white/10 bg-black/25 backdrop-blur-md">
            <div class="flex flex-wrap items-center justify-between gap-2 px-4 py-4 sm:px-5">
              <div><h3 class="font-black">Partidas recientes</h3><p class="mt-1 text-xs text-white/50">Tu historial de juego</p></div>
              <span class="rounded-full bg-[#14363a] px-3 py-1 text-xs font-bold text-[#d5e67b]">${history.matches.length} partidas</span>
            </div>
            <div class="overflow-x-auto">
              <table class="w-full min-w-[560px] border-collapse text-left">
                <thead class="bg-white/5 text-xs uppercase tracking-wider text-white/45"><tr><th class="px-4 py-3 font-bold">Fecha</th><th class="px-4 py-3 font-bold">Modo</th><th class="px-4 py-3 font-bold">Resultado</th><th class="px-4 py-3 text-right font-bold">Puntuación</th></tr></thead>
                <tbody>${rows || '<tr><td colspan="4" class="px-4 py-10 text-center text-sm text-white/45">Aún no hay partidas en el historial.</td></tr>'}</tbody>
              </table>
            </div>
          </section>
          <p id="profile-status" class="mt-3 min-h-5 text-sm text-[#d5e67b]" role="status" aria-live="polite"></p>
        </main>
      </section>`;
  }

  mount(container: HTMLElement): void {
    this.container = container;
    this.listeners = new AbortController();
    container.insertAdjacentHTML('beforeend', this.render());
    container.querySelector<HTMLButtonElement>('#profile-logout')!.addEventListener('click', () => {
      localStorage.removeItem('cacho-user-profile');
      container.dispatchEvent(new CustomEvent('cacho:navigate', {
        bubbles: true,
        detail: { viewId: 'view-auth' }
      }));
    }, { signal: this.listeners.signal });
  }

  unmount(): void {
    this.listeners?.abort();
    this.listeners = null;
    this.container?.querySelector('#view-profile')?.remove();
    this.container = null;
  }

  private getUser(): UserProfile {
    const fallback: UserProfile = { id: 'guest', username: 'Jugador', gamesPlayed: 0, wins: 0 };
    const raw = localStorage.getItem('cacho-user-profile');
    if (!raw) return fallback;
    try {
      const value = JSON.parse(raw) as Partial<UserProfile>;
      return typeof value.username === 'string' && value.username.trim()
        ? { ...fallback, ...value, username: value.username.trim() }
        : fallback;
    } catch (error) {
      console.error('No se pudo leer el perfil guardado.', error);
      return fallback;
    }
  }

  private getHistory(): PlayerHistory {
    const fallback: PlayerHistory = { gamesPlayed: 0, wins: 0, pointsScored: 0, handDormidas: 0, matches: [] };
    const raw = localStorage.getItem('cacho-player-history');
    if (!raw) return fallback;
    try {
      const value = JSON.parse(raw) as Partial<PlayerHistory>;
      const matches = Array.isArray(value.matches) ? value.matches.filter((match): match is MatchRecord =>
        typeof match?.date === 'string' &&
        typeof match.mode === 'string' &&
        (match.result === 'win' || match.result === 'loss') &&
        typeof match.score === 'number' && Number.isFinite(match.score)
      ).slice(0, 50) : [];
      return {
        gamesPlayed: this.safeCount(value.gamesPlayed),
        wins: this.safeCount(value.wins),
        pointsScored: this.safeCount(value.pointsScored),
        handDormidas: this.safeCount(value.handDormidas),
        matches
      };
    } catch (error) {
      console.error('No se pudo leer el historial de partidas.', error);
      return fallback;
    }
  }

  private safeCount(value: unknown): number {
    return typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
  }

  private formatDate(date: string): string {
    const parsed = new Date(date);
    return Number.isNaN(parsed.getTime()) ? date : new Intl.DateTimeFormat('es', { dateStyle: 'medium' }).format(parsed);
  }

  private metric(label: string, value: string, icon: string, color: string): string {
    return `<article class="rounded-2xl border border-white/10 bg-black/30 p-5 backdrop-blur-md"><div class="flex items-center justify-between"><p class="text-xs font-bold uppercase tracking-wider text-white/50">${label}</p><span aria-hidden="true">${icon}</span></div><p class="mt-3 text-3xl font-black ${color}">${value}</p></article>`;
  }

  private escape(value: string): string {
    return value.replace(/[&<>"']/g, character => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[character]!);
  }
}
