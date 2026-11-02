import { Routes } from '@angular/router';
export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'hoje' },
  { path: 'hoje', loadComponent: () => import('./features/today/today').then(m => m.Today), title: 'Hoje · Academia' },
  { path: 'treinos', loadComponent: () => import('./features/training/training').then(m => m.Training), title: 'Treinos · Academia' },
  { path: 'evolucao', loadComponent: () => import('./features/evolution/evolution').then(m => m.Evolution), title: 'Evolução · Academia' },
  { path: 'configuracoes', loadComponent: () => import('./features/settings/settings').then(m => m.Settings), title: 'Configurações · Academia' },
  { path: '**', redirectTo: 'hoje' },
];
