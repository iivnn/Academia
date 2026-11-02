import { Component, input } from '@angular/core';
import { MuscleGroup } from '../../core/training/training.models';
@Component({ selector: 'app-muscle-map', styleUrl: './muscle-map.css', template: `
  <div class="figures">
    @for (side of ['Frente', 'Costas']; track side) {
      <figure><svg viewBox="0 0 100 210" role="img" [attr.aria-label]="side + ': músculos-alvo ' + muscles().join(', ')">
        <path class="body" d="M42 3h16v4h5v20h-5v6h-3v5h15v5h9v10h5v35h5v32h-9V92h-6V68h-4v51h-2v39h-3v44H53v-45h-6v45H35v-44h-3v-39h-2V68h-4v24h-6v28h-9V88h5V53h5V43h9v-5h15v-5h-3v-6h-5V7h5z"/>
        <g [class.active]="has('Ombros')"><path d="M23 46h13v15H21V52h2zM64 46h13v6h2v9H64z"/></g>
        @if (side === 'Frente') {
          <g [class.active]="has('Peito')"><path d="M35 48h13v22H33V57h2zM52 48h13v9h2v13H52z"/></g>
          <g [class.active]="has('Bíceps')"><path d="M20 64h9v21h-9zM71 64h9v21h-9z"/></g>
          <g [class.active]="has('Abdômen')"><path d="M37 75h11v31H37zM52 75h11v31H52z"/></g>
          <g [class.active]="has('Quadríceps')"><path d="M35 121h12v32H35zM53 121h12v32H53z"/></g>
        } @else {
          <g [class.active]="has('Costas')"><path d="M35 48h30v29h-5v25H40V77h-5z"/></g>
          <g [class.active]="has('Tríceps')"><path d="M20 64h9v21h-9zM71 64h9v21h-9z"/></g>
          <g [class.active]="has('Glúteos')"><path d="M34 107h14v17H34zM52 107h14v17H52z"/></g>
          <g [class.active]="has('Posteriores')"><path d="M35 128h12v25H35zM53 128h12v25H53z"/></g>
        }
        <g [class.active]="has('Panturrilhas')"><path d="M37 163h8v23h-8zM55 163h8v23h-8z"/></g>
      </svg><figcaption>{{ side }}</figcaption></figure>
    }
  </div><p class="legend"><span aria-hidden="true">■</span> {{ muscles().join(' · ') }}<small>Ilustração esquemática dos grupos cadastrados</small></p>
` })
export class MuscleMap { readonly muscles = input<MuscleGroup[]>([]); has(muscle: MuscleGroup) { return this.muscles().includes(muscle); } }
