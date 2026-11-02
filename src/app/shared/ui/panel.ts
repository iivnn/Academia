import { Component, input } from '@angular/core';
@Component({
  selector: 'app-panel',
  template: '<ng-content />',
  styleUrl: './panel.css',
  host: { '[attr.data-tone]': 'tone()' },
})
export class Panel { readonly tone = input<'default' | 'gold'>('default'); }
