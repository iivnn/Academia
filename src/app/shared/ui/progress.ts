import { Component, computed, input } from '@angular/core';
@Component({ selector: 'app-progress', template: `
  <div class="caption"><span>{{ label() }}</span><strong>{{ safeValue() }}%</strong></div>
  <div class="track" role="progressbar" [attr.aria-label]="label()" aria-valuemin="0" aria-valuemax="100" [attr.aria-valuenow]="safeValue()"><div class="fill" [style.width.%]="safeValue()"></div></div>
`, styleUrl: './progress.css' })
export class Progress {
  readonly label = input.required<string>();
  readonly value = input(0);
  readonly safeValue = computed(() => Number.isFinite(this.value()) ? Math.min(100, Math.max(0, this.value())) : 0);
}
