import { Component, input } from '@angular/core';

@Component({
  selector: 'button[appButton]',
  template: '<ng-content />',
  styleUrl: './button.css',
  host: { '[attr.data-variant]': 'variant()', '[attr.type]': 'type()' },
})
export class Button {
  readonly variant = input<'primary' | 'secondary' | 'ghost' | 'danger'>('primary');
  readonly type = input<'button' | 'submit' | 'reset'>('button');
}
