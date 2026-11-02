import { Component, input } from '@angular/core';
@Component({ selector: 'app-field', template: `
  <label [for]="controlId()">{{ label() }}</label>
  <ng-content />
  @if (error() || hint()) { <p [id]="controlId() + '-help'" [class.error]="!!error()">{{ error() || hint() }}</p> }
`, styleUrl: './field.css' })
export class Field {
  readonly controlId = input.required<string>();
  readonly label = input.required<string>();
  readonly hint = input('');
  readonly error = input('');
}
