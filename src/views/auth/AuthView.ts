import { AuthService } from '../../services/auth.service';
import type { AuthenticatedUser, UserCredentials } from '../../types/user.types';
import type { View } from '../View';

export class AuthView implements View {
  private container: HTMLElement | null = null;
  private listeners: AbortController | null = null;
  private mode: 'login' | 'register' = 'login';

  constructor(
    private readonly auth = new AuthService(),
    private readonly onAuthenticated: (user: AuthenticatedUser) => void = () => undefined
  ) {}

  render(): string {
    const isRegistering = this.mode === 'register';
    return `
      <section id="view-auth" class="flex min-h-0 flex-1 flex-col items-center justify-center overflow-y-auto bg-[#0b2027] px-4 py-8 text-white sm:px-6">
        <div class="w-full max-w-md rounded-3xl border border-[#f5aa14]/25 bg-black/30 p-6 shadow-2xl shadow-black/30 backdrop-blur-md sm:p-8">
          <div class="mb-7 text-center">
            <div class="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl border border-[#d5e67b]/20 bg-[#14363a] text-3xl">🎲</div>
            <p class="text-xs font-extrabold uppercase tracking-[0.24em] text-[#f5aa14]">Cacho Boliviano PRO</p>
            <h1 class="mt-2 text-3xl font-black text-[#d5e67b]">${isRegistering ? 'Crear cuenta' : '¡Qué bueno verte!'}</h1>
            <p class="mt-2 text-sm text-white/60">Inicia sesión para guardar tus estadísticas y partidas.</p>
          </div>

          <div class="mb-6 grid grid-cols-2 rounded-xl border border-white/10 bg-black/20 p-1" role="tablist" aria-label="Acceso">
            <button type="button" data-auth-mode="login" role="tab" aria-selected="${!isRegistering}" class="rounded-lg px-3 py-2.5 text-sm font-bold ${!isRegistering ? 'bg-[#f5aa14] text-[#0b2027]' : 'text-white/65 hover:text-white'}">Iniciar Sesión</button>
            <button type="button" data-auth-mode="register" role="tab" aria-selected="${isRegistering}" class="rounded-lg px-3 py-2.5 text-sm font-bold ${isRegistering ? 'bg-[#f5aa14] text-[#0b2027]' : 'text-white/65 hover:text-white'}">Crear Cuenta</button>
          </div>

          <form id="auth-form" class="space-y-4" novalidate>
            ${isRegistering ? `
              <label class="block text-sm font-semibold text-white/80" for="auth-username">Usuario
                <input id="auth-username" name="username" type="text" required minlength="2" maxlength="32" autocomplete="nickname" class="mt-2 w-full rounded-xl border border-white/10 bg-[#14363a]/80 px-4 py-3 text-white outline-none transition placeholder:text-white/30 focus:border-[#d5e67b]/60" placeholder="Tu nombre en la mesa">
              </label>` : ''}
            <label class="block text-sm font-semibold text-white/80" for="auth-email">Email
              <input id="auth-email" name="email" type="email" required autocomplete="email" class="mt-2 w-full rounded-xl border border-white/10 bg-[#14363a]/80 px-4 py-3 text-white outline-none transition placeholder:text-white/30 focus:border-[#d5e67b]/60" placeholder="jugador@ejemplo.com">
            </label>
            <label class="block text-sm font-semibold text-white/80" for="auth-password">Contraseña
              <input id="auth-password" name="password" type="password" required minlength="8" autocomplete="${isRegistering ? 'new-password' : 'current-password'}" class="mt-2 w-full rounded-xl border border-white/10 bg-[#14363a]/80 px-4 py-3 text-white outline-none transition placeholder:text-white/30 focus:border-[#d5e67b]/60" placeholder="Al menos 8 caracteres">
            </label>
            <p id="auth-status" class="min-h-5 text-sm text-[#d5e67b]" role="status" aria-live="polite"></p>
            <button id="auth-submit" type="submit" class="w-full rounded-xl bg-[#f26b4f] px-4 py-3.5 font-extrabold text-white shadow-lg shadow-[#f26b4f]/15 transition hover:bg-[#db5b43] focus:outline-none focus:ring-2 focus:ring-[#f5aa14]">
              ${isRegistering ? 'Crear cuenta' : 'Iniciar sesión'}
            </button>
          </form>
          <button type="button" data-view-target="view-lobby" class="mt-5 w-full rounded-xl border border-[#d5e67b]/20 px-4 py-3 text-sm font-bold text-[#d5e67b] transition hover:bg-white/5">Continuar como invitado</button>
        </div>
      </section>`;
  }

  mount(container: HTMLElement): void {
    this.container = container;
    this.listeners = new AbortController();
    container.insertAdjacentHTML('beforeend', this.render());
    this.bindEvents();
  }

  unmount(): void {
    this.listeners?.abort();
    this.listeners = null;
    this.container?.querySelector('#view-auth')?.remove();
    this.container = null;
  }

  private bindEvents(): void {
    const signal = this.listeners!.signal;
    const root = this.container!.querySelector<HTMLElement>('#view-auth')!;
    root.querySelectorAll<HTMLButtonElement>('[data-auth-mode]').forEach(button => {
      button.addEventListener('click', () => {
        this.mode = button.dataset.authMode === 'register' ? 'register' : 'login';
        const container = this.container!;
        this.unmount();
        this.mount(container);
      }, { signal });
    });

    root.querySelector<HTMLFormElement>('#auth-form')!.addEventListener('submit', event => {
      event.preventDefault();
      void this.submit(root);
    }, { signal });
  }

  private async submit(root: HTMLElement): Promise<void> {
    const form = root.querySelector<HTMLFormElement>('#auth-form')!;
    const status = root.querySelector<HTMLElement>('#auth-status')!;
    const submit = root.querySelector<HTMLButtonElement>('#auth-submit')!;
    if (!form.reportValidity()) return;
    const values = new FormData(form);
    const credentials: UserCredentials = {
      email: String(values.get('email')).trim(),
      password: String(values.get('password'))
    };
    const username = String(values.get('username') ?? '').trim();
    if (this.mode === 'register' && username.length < 2) {
      status.textContent = 'El usuario debe tener al menos 2 caracteres.';
      return;
    }

    submit.disabled = true;
    submit.textContent = 'Conectando…';
    status.textContent = '';
    try {
      const user = this.mode === 'register'
        ? await this.auth.register({ ...credentials, username })
        : await this.auth.login(credentials);
      if (!root.isConnected) return;
      this.onAuthenticated(user);
    } catch (error) {
      status.textContent = error instanceof Error ? error.message : 'No se pudo completar el acceso.';
    } finally {
      if (submit.isConnected) {
        submit.disabled = false;
        submit.textContent = this.mode === 'register' ? 'Crear cuenta' : 'Iniciar sesión';
      }
    }
  }
}
