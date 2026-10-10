import type { InstallPromptEvent } from '../types/user.types';

export class PwaService {
  private installPrompt: InstallPromptEvent | null = null;
  private readonly cleanup: Array<() => void> = [];
  private updateTimer: number | null = null;
  private disposed = false;

  initialize(): void {
    this.disposed = false;
    const installButton = document.getElementById('btn-install') as HTMLButtonElement;
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
      Boolean((navigator as Navigator & { standalone?: boolean }).standalone);

    if (!isStandalone) installButton.classList.add('is-visible');

    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      this.installPrompt = event as InstallPromptEvent;
    };
    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
    this.cleanup.push(() => window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt));

    const onAppInstalled = () => {
      this.installPrompt = null;
      installButton.classList.remove('is-visible');
    };
    window.addEventListener('appinstalled', onAppInstalled);
    this.cleanup.push(() => window.removeEventListener('appinstalled', onAppInstalled));

    installButton.addEventListener('click', async () => {
      if (!this.installPrompt) {
        const isAppleMobile = /iphone|ipad|ipod/i.test(navigator.userAgent) ||
          (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
        window.alert(isAppleMobile
          ? 'Para instalarlo, abre el menú Compartir de Safari y elige "Añadir a pantalla de inicio".'
          : 'Abre el menú de tu navegador y elige "Instalar Cacho Boliviano" o "Añadir a pantalla de inicio".');
        return;
      }

      await this.installPrompt.prompt();
      const choice = await this.installPrompt.userChoice;
      if (choice.outcome === 'accepted') installButton.classList.remove('is-visible');
      this.installPrompt = null;
    });

    this.initializeServiceWorker();
  }

  dispose(): void {
    this.disposed = true;
    this.cleanup.splice(0).forEach(dispose => dispose());
    if (this.updateTimer !== null) {
      window.clearInterval(this.updateTimer);
      this.updateTimer = null;
    }
    this.installPrompt = null;
  }

  private initializeServiceWorker(): void {
    if (!('serviceWorker' in navigator)) return;
    const register = () => {
      void navigator.serviceWorker.register('/sw.js').then(registration => {
        if (this.disposed) return;
        const updateBanner = document.getElementById('update-banner');
        const updateButton = document.getElementById('btn-update');
        if (!updateBanner || !updateButton) return;
        const showUpdate = () => updateBanner.classList.replace('hidden', 'flex');
        if (registration.waiting) showUpdate();
        const onUpdateFound = () => {
          const installing = registration.installing;
          if (!installing) return;
          const onStateChange = () => {
            if (installing.state === 'installed' && navigator.serviceWorker.controller) showUpdate();
          };
          installing.addEventListener('statechange', onStateChange);
          this.cleanup.push(() => installing.removeEventListener('statechange', onStateChange));
        };
        registration.addEventListener('updatefound', onUpdateFound);
        this.cleanup.push(() => registration.removeEventListener('updatefound', onUpdateFound));

        const onUpdateClick = () => registration.waiting?.postMessage({ type: 'SKIP_WAITING' });
        updateButton.addEventListener('click', onUpdateClick);
        this.cleanup.push(() => updateButton.removeEventListener('click', onUpdateClick));

        let reloading = false;
        const onControllerChange = () => {
          if (reloading) return;
          reloading = true;
          window.location.reload();
        };
        navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);
        this.cleanup.push(() => navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange));
        this.updateTimer = window.setInterval(() => void registration.update(), 60 * 60 * 1000);
      }).catch(error => {
        console.error('No se pudo registrar el service worker.', error);
      });
    };
    if (document.readyState === 'complete') {
      register();
    } else {
      window.addEventListener('load', register, { once: true });
      this.cleanup.push(() => window.removeEventListener('load', register));
    }
  }
}
