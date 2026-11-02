import { Component, DestroyRef, ElementRef, inject, viewChild } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { PwaService } from './core/pwa/pwa.service';
import { TrainingStore } from './core/training/training.store';
import { Button } from './shared/ui';
@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, Button],
  styleUrl: './app.css',
  template: `
    <a class="skip" href="#main-content" (click)="$event.preventDefault(); mainContent.focus()">Pular para o conteúdo</a>
    <header class="app-header">
      <a routerLink="/hoje" aria-label="Academia, início" class="brand"><span class="brand-icon" aria-hidden="true">A</span><span>ACADEMIA<small>DIÁRIO DE EVOLUÇÃO</small></span></a>
      <div class="header-actions"><a class="settings-link" routerLink="/configuracoes" routerLinkActive="selected" ariaCurrentWhenActive="page" aria-label="Configurações"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 2h6v3h3v3h3v8h-3v3h-3v3H9v-3H6v-3H3V8h3V5h3z"/><path d="M9 9h6v6H9z" class="gear-hole"/></svg></a></div>
    </header>
    @if (pwa.updateAvailable()) { <aside class="notice" role="status">Uma nova versão está disponível. <button appButton (click)="pwa.applyUpdate()">Atualizar</button></aside> }
    @if (pwa.error()) { <aside class="notice notice--danger" role="alert">{{ pwa.error() }}</aside> }
    @if (training.state().testData) { <aside class="notice" role="status">Base de testes ativa. Os resultados exibidos são fictícios. <a routerLink="/configuracoes">Configurações</a></aside> }
    <main #mainContent id="main-content" tabindex="-1"><router-outlet /></main>
      <nav class="bottom-nav" aria-label="Navegação principal">
        <a routerLink="/hoje" routerLinkActive="active" ariaCurrentWhenActive="page"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 10h3V7h3V4h3V1h2v3h3v3h3v3h3v3h-3v9h-5v-7h-4v7H5v-9H2z"/></svg><span>Hoje</span></a>
        <a routerLink="/treinos" routerLinkActive="active" ariaCurrentWhenActive="page"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M1 8h3V5h4v5h8V5h4v3h3v8h-3v3h-4v-5H8v5H4v-3H1z"/></svg><span>Treinos</span></a>
        <a routerLink="/evolucao" routerLinkActive="active" ariaCurrentWhenActive="page"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 13h4v9H3zM10 8h4v14h-4zM17 2h4v20h-4z"/></svg><span>Evolução</span></a>
      </nav>
  `,
})
export class App {
  readonly pwa = inject(PwaService);
  readonly training = inject(TrainingStore);
  readonly router = inject(Router);
  private readonly main = viewChild<ElementRef<HTMLElement>>('mainContent');
  constructor() {
    this.router.events.pipe(takeUntilDestroyed(inject(DestroyRef))).subscribe(event => {
      if (event instanceof NavigationEnd) {
        window.scrollTo({ top: 0, behavior: 'instant' });
        this.main()?.nativeElement.focus({ preventScroll: true });
      }
    });
  }
}

