import { Component, input } from '@angular/core';
@Component({ selector: 'app-badge', template: '<ng-content />', styleUrl: './badge.css', host: { '[attr.data-tone]': 'tone()' } })
export class Badge { readonly tone = input<'green' | 'gold' | 'muted' | 'danger'>('green'); }
