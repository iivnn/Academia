import { Component, computed, input } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { ChartPoint } from '../../core/training/evolution.analytics';
@Component({ selector: 'app-history-chart', imports: [DatePipe, DecimalPipe], styleUrl: './history-chart.css', template: `
  <figure>
    <figcaption>{{ title() }}</figcaption>
    @if (points().length) {
      <svg viewBox="0 0 400 260" role="img" [attr.aria-label]="description()">
        @for (tick of ticks(); track tick.y) { <line x1="64" x2="382" [attr.y1]="tick.y" [attr.y2]="tick.y" class="grid"/><text x="54" [attr.y]="tick.y + 4" text-anchor="end">{{ axis(tick.value) }}</text> }
        @if (bars()) {
          @for (point of plotted(); track $index) { <rect [attr.x]="point.x - barWidth() / 2" [attr.y]="point.y" [attr.width]="barWidth()" [attr.height]="208 - point.y" class="bar"><title>{{ point.date | date:'dd/MM/yyyy' }}: {{ point.value | number:'1.0-2' }} {{ unit() }}</title></rect> }
        } @else {
          <polyline [attr.points]="line()" class="line"/>
          @for (point of plotted(); track $index) { <circle [attr.cx]="point.x" [attr.cy]="point.y" r="5" class="point"><title>{{ point.date | date:'dd/MM/yyyy HH:mm' }}: {{ point.value | number:'1.0-2' }} {{ unit() }}</title></circle> }
        }
        <text x="64" y="244">{{ points()[0].date | date:dateFormat() }}</text><text x="382" y="244" text-anchor="end">{{ points()[points().length - 1].date | date:dateFormat() }}</text>
      </svg>
      @if (points().length === 1 && !bars()) { <p class="hint">Um registro disponível. A linha aparece ao registrar outras sessões.</p> }
      <details><summary>Ver valores do gráfico</summary><div class="values"><table><thead><tr><th scope="col">Data</th><th scope="col">Valor ({{ unit() }})</th><th scope="col">Contexto</th></tr></thead><tbody>@for (point of points(); track $index) { <tr><td>{{ point.date | date:'dd/MM/yy HH:mm' }}</td><td>{{ point.value | number:'1.0-2' }}</td><td>{{ point.note || '—' }}</td></tr> }</tbody></table></div></details>
    } @else { <p class="hint">Sem registros para este gráfico no período.</p> }
  </figure>
` })
export class HistoryChart {
  axis(value: number) { return new Intl.NumberFormat('pt-BR', { notation: value >= 1000 ? 'compact' : 'standard', maximumFractionDigits: 1 }).format(value); }
  readonly points = input<ChartPoint[]>([]);
  readonly title = input.required<string>();
  readonly unit = input(''); readonly bars = input(false);
  readonly maximum = computed(() => this.points().reduce((max, point) => Math.max(max, point.value), 1) * 1.12);
  readonly plotted = computed(() => {
    const points = this.points(), first = points[0]?.date ?? 0, last = points.at(-1)?.date ?? first;
    return points.map(point => ({ ...point, x: first === last ? 223 : 80 + (point.date - first) / (last - first) * 286, y: 208 - point.value / this.maximum() * 180 }));
  });
  readonly ticks = computed(() => [0, .5, 1].map(fraction => ({ y: 208 - fraction * 180, value: this.maximum() * fraction })));
  readonly barWidth = computed(() => Math.min(24, 240 / Math.max(1, this.points().length)));
  readonly dateFormat = computed(() => this.points().length > 1 && new Date(this.points()[0].date).toDateString() === new Date(this.points().at(-1)!.date).toDateString() ? 'HH:mm' : 'dd/MM/yy');
  readonly line = computed(() => this.plotted().map(point => `${point.x},${point.y}`).join(' '));
  readonly description = computed(() => `${this.title()}. ${this.points().length} registros. Valores e datas completos na tabela abaixo. Unidade: ${this.unit()}.`);
}
