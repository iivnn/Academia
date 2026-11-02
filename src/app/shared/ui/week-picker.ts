import { Component, model } from '@angular/core';
@Component({ selector: 'app-week-picker', template: `
  <div class="week" role="group" aria-label="Dias de treino">
    @for (day of days; track day.full; let i = $index) {
      <button type="button" [attr.aria-label]="day.full" [attr.aria-pressed]="selected().includes(i)" (click)="toggle(i)">{{ day.short }}</button>
    }
  </div>`, styleUrl: './week-picker.css' })
export class WeekPicker {
  readonly selected = model<number[]>([0, 2, 4]);
  readonly days = [
    { short: 'S', full: 'Segunda-feira' }, { short: 'T', full: 'Terça-feira' },
    { short: 'Q', full: 'Quarta-feira' }, { short: 'Q', full: 'Quinta-feira' },
    { short: 'S', full: 'Sexta-feira' }, { short: 'S', full: 'Sábado' }, { short: 'D', full: 'Domingo' },
  ];
  toggle(day: number) { this.selected.update(days => days.includes(day) ? days.filter(d => d !== day) : [...days, day].sort()); }
}
