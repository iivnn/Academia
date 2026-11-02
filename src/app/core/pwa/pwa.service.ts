import { DestroyRef, Injectable, inject, signal } from '@angular/core';
import { SwUpdate } from '@angular/service-worker';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
@Injectable({ providedIn: 'root' })
export class PwaService {
  private readonly updates = inject(SwUpdate);
  readonly online = signal(navigator.onLine);
  readonly updateAvailable = signal(false);
  readonly error = signal('');
  constructor() {
    const on = () => { this.online.set(true); void this.check(); };
    const off = () => this.online.set(false);
    window.addEventListener('online', on); window.addEventListener('offline', off);
    inject(DestroyRef).onDestroy(() => { window.removeEventListener('online', on); window.removeEventListener('offline', off); });
    if (this.updates.isEnabled) {
      this.updates.versionUpdates.pipe(takeUntilDestroyed()).subscribe(event => {
        if (event.type === 'VERSION_READY') this.updateAvailable.set(true);
      });
      this.updates.unrecoverable.pipe(takeUntilDestroyed()).subscribe(() => this.error.set('Reabra o aplicativo com internet para recuperar os arquivos offline.'));
      void this.check();
    }
  }
  private async check() {
    if (this.updates.isEnabled && this.online()) {
      try { await this.updates.checkForUpdate(); } catch { /* Uma falha de rede não impede o uso local. */ }
    }
  }
  applyUpdate() { window.location.reload(); }
}
