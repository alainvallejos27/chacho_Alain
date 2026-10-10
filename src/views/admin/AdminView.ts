import type { View } from '../View';

export interface AdminUserRecord {
  id: string;
  name: string;
  email: string;
  role: 'player' | 'admin';
  status: 'active' | 'suspended' | 'banned';
}

export interface AdminRoomRecord {
  code: string;
  host: string;
  players: number;
  startedAt: string;
}

export interface AdminDashboardStats {
  totalUsers: number;
  connectedUsers: number;
  gamesToday: number;
  activeRooms: number;
}

export class AdminView implements View {
  private container: HTMLElement | null = null;
  private listeners: AbortController | null = null;
  private users: AdminUserRecord[] = [];
  private rooms: AdminRoomRecord[] = [];
  private stats: AdminDashboardStats = { totalUsers: 0, connectedUsers: 0, gamesToday: 0, activeRooms: 0 };

  render(): string {
    return `
      <section id="view-admin" class="flex min-h-0 flex-1 flex-col overflow-y-auto bg-[#0b2027] text-white">
        <header class="flex items-center justify-between border-b border-[#f5aa14]/15 px-4 py-4 sm:px-8">
          <button type="button" data-view-target="view-lobby" class="rounded-lg px-2 py-2 text-sm font-bold text-[#d5e67b] hover:bg-white/5">← Lobby</button>
          <h1 class="text-lg font-black text-[#d5e67b]">Dashboard Admin</h1>
          <span class="rounded-full border border-[#f5aa14]/20 px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider text-[#f5aa14]">Administración</span>
        </header>
        <main class="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-8">
          <div class="mb-6"><h2 class="text-2xl font-black sm:text-3xl">Resumen de plataforma</h2><p class="mt-1 text-sm text-white/50">Indicadores recibidos desde el servicio de administración.</p></div>
          <section id="admin-kpis" aria-label="Indicadores clave" class="grid grid-cols-2 gap-3 xl:grid-cols-4">
            ${this.kpi('Usuarios totales', this.stats.totalUsers, '👥', 'text-[#d5e67b]')}
            ${this.kpi('Conectados en vivo', this.stats.connectedUsers, '🟢', 'text-emerald-300')}
            ${this.kpi('Partidas de hoy', this.stats.gamesToday, '🎲', 'text-[#f5aa14]')}
            ${this.kpi('Salas activas', this.stats.activeRooms, '🌐', 'text-[#f26b4f]')}
          </section>

          <section class="mt-7 overflow-hidden rounded-2xl border border-white/10 bg-black/30 backdrop-blur-md">
            <div class="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-4 py-4 sm:px-5">
              <div role="tablist" aria-label="Administración" class="flex gap-2">
                <button type="button" data-admin-tab="users" role="tab" aria-selected="true" class="rounded-xl bg-[#f5aa14] px-4 py-2 text-sm font-extrabold text-[#0b2027]">Gestión de Usuarios</button>
                <button type="button" data-admin-tab="rooms" role="tab" aria-selected="false" class="rounded-xl px-4 py-2 text-sm font-extrabold text-white/60 transition hover:text-white">Salas Activas</button>
              </div>
              <label class="relative">
                <span class="sr-only">Buscar usuarios</span>
                <input id="admin-user-search" type="search" placeholder="Buscar usuarios…" class="w-full rounded-xl border border-white/10 bg-[#14363a]/70 px-3 py-2 text-sm text-white outline-none placeholder:text-white/35 focus:border-[#d5e67b]/50 sm:w-64">
              </label>
            </div>

            <div id="admin-users-panel" role="tabpanel" class="overflow-x-auto">
              <table class="w-full min-w-[760px] border-collapse text-left">
                <thead class="bg-white/5 text-xs uppercase tracking-wider text-white/45"><tr><th class="px-4 py-3">Usuario</th><th class="px-4 py-3">Email</th><th class="px-4 py-3">Rol</th><th class="px-4 py-3">Estado</th><th class="px-4 py-3 text-right">Acciones</th></tr></thead>
                <tbody id="admin-users-body"></tbody>
              </table>
              <p id="admin-users-empty" class="px-4 py-10 text-center text-sm text-white/45">No hay datos de usuarios disponibles.</p>
            </div>

            <div id="admin-rooms-panel" role="tabpanel" class="hidden overflow-x-auto">
              <table class="w-full min-w-[650px] border-collapse text-left">
                <thead class="bg-white/5 text-xs uppercase tracking-wider text-white/45"><tr><th class="px-4 py-3">Código</th><th class="px-4 py-3">Anfitrión</th><th class="px-4 py-3">Jugadores</th><th class="px-4 py-3">Iniciada</th><th class="px-4 py-3 text-right">Acciones</th></tr></thead>
                <tbody id="admin-rooms-body"></tbody>
              </table>
              <p id="admin-rooms-empty" class="px-4 py-10 text-center text-sm text-white/45">No hay salas activas.</p>
            </div>
          </section>
          <p id="admin-status" class="mt-3 min-h-5 text-sm text-[#d5e67b]" role="status" aria-live="polite"></p>
        </main>
      </section>`;
  }

  mount(container: HTMLElement): void {
    this.container = container;
    this.listeners = new AbortController();
    container.insertAdjacentHTML('beforeend', this.render());
    const root = container.querySelector<HTMLElement>('#view-admin')!;
    const signal = this.listeners.signal;
    root.addEventListener('click', event => this.onClick(event), { signal });
    root.querySelector<HTMLInputElement>('#admin-user-search')!.addEventListener('input', () => this.renderUsers(), { signal });
    window.addEventListener('cacho:admin:users', event => {
      this.users = (event as CustomEvent<AdminUserRecord[]>).detail;
      this.renderUsers();
    }, { signal });
    window.addEventListener('cacho:admin:rooms', event => {
      this.rooms = (event as CustomEvent<AdminRoomRecord[]>).detail;
      this.renderRooms();
    }, { signal });
    window.addEventListener('cacho:admin:stats', event => {
      this.stats = (event as CustomEvent<AdminDashboardStats>).detail;
      this.renderStats();
    }, { signal });
    this.renderUsers();
    this.renderRooms();
  }

  unmount(): void {
    this.listeners?.abort();
    this.listeners = null;
    this.container?.querySelector('#view-admin')?.remove();
    this.container = null;
  }

  private onClick(event: Event): void {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const tab = target.closest<HTMLButtonElement>('[data-admin-tab]');
    if (tab) {
      this.selectTab(tab.dataset.adminTab === 'rooms' ? 'rooms' : 'users');
      return;
    }
    const actionButton = target.closest<HTMLButtonElement>('[data-admin-action]');
    if (!actionButton) return;
    const action = actionButton.dataset.adminAction;
    const id = actionButton.dataset.recordId;
    if (!id) return;
    if (action === 'role') {
      const user = this.users.find(record => record.id === id);
      if (!user) return;
      const handled = this.emit('cacho:admin:user-role', { userId: id, role: user.role === 'admin' ? 'player' : 'admin' });
      this.setStatus(handled ? 'Solicitud de cambio de rol enviada.' : 'Servicio de administración no configurado.');
    } else if (action === 'suspend') {
      const handled = this.emit('cacho:admin:user-suspend', { userId: id });
      this.setStatus(handled ? 'Solicitud de suspensión enviada.' : 'Servicio de administración no configurado.');
    } else if (action === 'ban') {
      if (!window.confirm('¿Solicitar el bloqueo permanente de este usuario?')) return;
      const handled = this.emit('cacho:admin:user-ban', { userId: id });
      this.setStatus(handled ? 'Solicitud de bloqueo enviada.' : 'Servicio de administración no configurado.');
    } else if (action === 'close-room') {
      if (!window.confirm(`¿Forzar el cierre de la sala ${id}?`)) return;
      const handled = this.emit('cacho:admin:room-close', { roomCode: id });
      this.setStatus(handled ? `Solicitud de cierre para la sala ${id} enviada.` : 'Servicio de administración no configurado.');
    }
  }

  private selectTab(tabName: 'users' | 'rooms'): void {
    const root = this.container!.querySelector<HTMLElement>('#view-admin')!;
    root.querySelectorAll<HTMLButtonElement>('[data-admin-tab]').forEach(button => {
      const selected = button.dataset.adminTab === tabName;
      button.setAttribute('aria-selected', String(selected));
      button.className = selected
        ? 'rounded-xl bg-[#f5aa14] px-4 py-2 text-sm font-extrabold text-[#0b2027]'
        : 'rounded-xl px-4 py-2 text-sm font-extrabold text-white/60 transition hover:text-white';
    });
    root.querySelector('#admin-users-panel')!.classList.toggle('hidden', tabName !== 'users');
    root.querySelector('#admin-rooms-panel')!.classList.toggle('hidden', tabName !== 'rooms');
    root.querySelector('#admin-user-search')!.parentElement!.classList.toggle('hidden', tabName !== 'users');
  }

  private renderUsers(): void {
    const root = this.container?.querySelector<HTMLElement>('#view-admin');
    if (!root) return;
    const query = root.querySelector<HTMLInputElement>('#admin-user-search')!.value.trim().toLocaleLowerCase();
    const users = this.users.filter(user => `${user.name} ${user.email}`.toLocaleLowerCase().includes(query));
    root.querySelector<HTMLElement>('#admin-users-body')!.innerHTML = users.map(user => `
      <tr class="border-t border-white/10">
        <td class="px-4 py-3 font-bold">${this.escape(user.name)}</td>
        <td class="px-4 py-3 text-sm text-white/60">${this.escape(user.email)}</td>
        <td class="px-4 py-3"><span class="rounded-full bg-[#f5aa14]/10 px-2.5 py-1 text-xs font-bold text-[#f5aa14]">${user.role === 'admin' ? 'Admin' : 'Jugador'}</span></td>
        <td class="px-4 py-3 text-xs font-bold ${user.status === 'active' ? 'text-emerald-300' : 'text-[#f26b4f]'}">${this.statusLabel(user.status)}</td>
        <td class="px-4 py-3"><div class="flex justify-end gap-2">
          <button type="button" data-admin-action="role" data-record-id="${this.escape(user.id)}" class="rounded-lg border border-white/10 px-2.5 py-1.5 text-xs font-bold hover:bg-white/5">${user.role === 'admin' ? 'Quitar admin' : 'Hacer admin'}</button>
          <button type="button" data-admin-action="suspend" data-record-id="${this.escape(user.id)}" class="rounded-lg border border-[#f5aa14]/20 px-2.5 py-1.5 text-xs font-bold text-[#f5aa14] hover:bg-[#f5aa14]/5">Suspender</button>
          <button type="button" data-admin-action="ban" data-record-id="${this.escape(user.id)}" class="rounded-lg border border-[#f26b4f]/20 px-2.5 py-1.5 text-xs font-bold text-[#f26b4f] hover:bg-[#f26b4f]/5">Bloquear</button>
        </div></td>
      </tr>`).join('');
    root.querySelector<HTMLElement>('#admin-users-empty')!.classList.toggle('hidden', users.length > 0);
  }

  private renderRooms(): void {
    const root = this.container?.querySelector<HTMLElement>('#view-admin');
    if (!root) return;
    root.querySelector<HTMLElement>('#admin-rooms-body')!.innerHTML = this.rooms.map(room => `
      <tr class="border-t border-white/10">
        <td class="px-4 py-3 font-black tracking-widest text-[#d5e67b]">${this.escape(room.code)}</td>
        <td class="px-4 py-3">${this.escape(room.host)}</td>
        <td class="px-4 py-3">${this.safeNumber(room.players)}</td>
        <td class="px-4 py-3 text-sm text-white/60">${this.escape(room.startedAt)}</td>
        <td class="px-4 py-3 text-right"><button type="button" data-admin-action="close-room" data-record-id="${this.escape(room.code)}" class="rounded-lg border border-[#f26b4f]/25 px-3 py-1.5 text-xs font-bold text-[#f26b4f] hover:bg-[#f26b4f]/5">Cerrar sala</button></td>
      </tr>`).join('');
    root.querySelector<HTMLElement>('#admin-rooms-empty')!.classList.toggle('hidden', this.rooms.length > 0);
  }

  private renderStats(): void {
    const root = this.container?.querySelector<HTMLElement>('#admin-kpis');
    if (!root) return;
    const cards = [
      ['Usuarios totales', this.stats.totalUsers, '👥', 'text-[#d5e67b]'],
      ['Conectados en vivo', this.stats.connectedUsers, '🟢', 'text-emerald-300'],
      ['Partidas de hoy', this.stats.gamesToday, '🎲', 'text-[#f5aa14]'],
      ['Salas activas', this.stats.activeRooms, '🌐', 'text-[#f26b4f]']
    ] as const;
    root.innerHTML = cards.map(([label, value, icon, color]) => this.kpi(label, value, icon, color)).join('');
  }

  private kpi(label: string, value: number, icon: string, color: string): string {
    return `<article class="rounded-2xl border border-white/10 bg-black/30 p-4 backdrop-blur-md sm:p-5"><div class="flex items-center justify-between"><p class="text-xs font-bold uppercase tracking-wider text-white/50">${label}</p><span aria-hidden="true">${icon}</span></div><p class="mt-3 text-3xl font-black ${color}">${this.safeNumber(value).toLocaleString('es')}</p></article>`;
  }

  private safeNumber(value: unknown): number {
    return typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
  }

  private statusLabel(status: AdminUserRecord['status']): string {
    return status === 'active' ? 'Activo' : status === 'suspended' ? 'Suspendido' : 'Bloqueado';
  }

  private setStatus(message: string): void {
    const status = this.container?.querySelector<HTMLElement>('#admin-status');
    if (status) status.textContent = message;
  }

  private emit(eventName: string, detail: Record<string, string>): boolean {
    const event = new CustomEvent(eventName, { detail, cancelable: true });
    return !window.dispatchEvent(event);
  }

  private escape(value: string): string {
    return value.replace(/[&<>"']/g, character => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[character]!);
  }
}
