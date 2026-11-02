import { ApplicationConfig, isDevMode, LOCALE_ID, provideBrowserGlobalErrorListeners } from '@angular/core';
import { registerLocaleData } from '@angular/common';
import localePt from '@angular/common/locales/pt';
import { provideRouter, withHashLocation } from '@angular/router';
import { provideServiceWorker } from '@angular/service-worker';
import { routes } from './app.routes';
registerLocaleData(localePt);
export const appConfig: ApplicationConfig = {
  providers: [{ provide: LOCALE_ID, useValue: 'pt-BR' }, provideBrowserGlobalErrorListeners(), provideRouter(routes, withHashLocation()),
    provideServiceWorker('ngsw-worker.js', { enabled: !isDevMode(), registrationStrategy: 'registerImmediately' })]
};
