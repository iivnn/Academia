import { Component, computed, inject, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Badge, Button, Field, Panel } from '../../shared/ui';
import { HistoryChart } from '../../shared/ui/history-chart';
import { TrainingStore } from '../../core/training/training.store';
import { activityDays, bestRecords, chartPoints, compatible, completedHistory, dayDate, exerciseKey, exerciseOptions, filterHistory, frequency, localDay, Metric, Observation, observations, overview, shiftDay, trend, validDay } from '../../core/training/evolution.analytics';
import { compare } from '../../core/training/training.domain';
import { Session } from '../../core/training/training.models';
@Component({ selector: 'app-evolution', imports: [DatePipe, DecimalPipe, RouterLink, Badge, Button, Field, Panel, HistoryChart], templateUrl: './evolution.html', styleUrl: './evolution.css' })
export class Evolution {
  readonly store = inject(TrainingStore);
  readonly tab = signal<'overview' | 'exercise'>('overview');
  readonly today = localDay(Date.now());
  readonly period = signal('90');
  readonly startInput = signal(shiftDay(this.today, -89));
  readonly endInput = signal(this.today);
  readonly start = computed(() => this.period() === 'all' ? '' : this.period() === 'custom' ? this.startInput() : shiftDay(this.today, -(Number(this.period()) - 1)));
  readonly end = computed(() => this.period() === 'custom' ? this.endInput() : this.today);
  readonly periodError = computed(() => {
    if (this.period() !== 'custom') return '';
    if (!validDay(this.startInput()) || !validDay(this.endInput())) return 'Informe as datas inicial e final.';
    if (this.startInput() > this.endInput()) return 'A data inicial precisa vir antes da final.';
    if (this.endInput() > this.today) return 'Escolha uma data final até hoje.';
    if (dayDate(this.endInput()).getTime() - dayDate(this.startInput()).getTime() > 5 * 366 * 86400000) return 'Escolha um intervalo de até 5 anos, ou use Todo o histórico.';
    return '';
  });
  readonly allHistory = computed(() => completedHistory(this.store.state().history));
  readonly history = computed(() => this.periodError() ? [] : filterHistory(this.allHistory(), this.start(), this.end()));
  readonly stats = computed(() => overview(this.history()));
  readonly calendar = computed(() => this.periodError() ? [] : activityDays(this.history(), this.end(), this.start()));
  readonly frequency = computed(() => this.periodError() ? { monthly: false, points: [] } : frequency(this.history(), this.start(), this.end()));
  readonly cardioFrequency = computed(() => this.periodError() ? { monthly: false, points: [] } : frequency(this.history(), this.start(), this.end(), 'cardio'));
  readonly options = computed(() => exerciseOptions(this.store.state().catalog, this.allHistory()));
  readonly selectedKey = signal('');
  readonly selected = computed<ReturnType<typeof exerciseOptions>[number] | undefined>(() => this.options().find(item => item.key === this.selectedKey()) ?? this.options()[0]);
  readonly workoutFilter = signal('');
  readonly structure = signal('all');
  readonly metric = signal<Metric>('weight');
  readonly load = signal('');
  readonly allEntries = computed(() => this.selected() ? observations(this.history(), this.selected()!.key) : []);
  readonly workoutOptions = computed(() => [...new Map(this.allEntries().map(entry => [entry.workoutId, entry.workoutName])).entries()].map(([id, name]) => ({ id, name })));
  readonly effectiveWorkout = computed(() => this.workoutOptions().some(item => item.id === this.workoutFilter()) ? this.workoutFilter() : '');
  readonly workoutEntries = computed(() => this.allEntries().filter(entry => !this.effectiveWorkout() || entry.workoutId === this.effectiveWorkout()));
  readonly structures = computed(() => [...new Set(this.workoutEntries().map(entry => entry.exercise.records.length))].sort((a, b) => a - b));
  readonly effectiveStructure = computed(() => this.structures().includes(Number(this.structure())) ? this.structure() : 'all');
  readonly entries = computed(() => this.workoutEntries().filter(entry => this.selected()?.exercise.kind === 'cardio' || this.effectiveStructure() === 'all' || entry.exercise.records.length === Number(this.effectiveStructure())));
  readonly cardio = computed(() => this.selected()?.exercise.kind === 'cardio');
  readonly effectiveMetric = computed<Metric>(() => this.cardio() ? 'duration' : this.metric() === 'duration' ? 'weight' : this.metric());
  readonly loads = computed(() => [...new Set(this.entries().flatMap(entry => entry.exercise.records.map(record => Number(record.weight.replace(',', '.')))))].sort((a, b) => a - b));
  readonly effectiveLoad = computed(() => this.load() !== '' && this.loads().includes(Number(this.load())) ? Number(this.load()) : this.entries().at(-1)?.maxWeight ?? 0);
  readonly points = computed(() => chartPoints(this.entries(), this.effectiveMetric(), this.effectiveLoad()));
  readonly graphTitle = computed(() => ({ weight: 'Maior carga por sessão', reps: 'Repetições totais por sessão', volume: 'Volume por sessão: carga × repetições', sameLoad: 'Repetições totais a ' + this.effectiveLoad().toLocaleString('pt-BR') + ' kg', duration: 'Duração de cada sessão de cardio' })[this.effectiveMetric()]);
  readonly graphUnit = computed(() => ({ weight: 'kg', reps: 'rep.', volume: 'kg × rep.', sameLoad: 'rep.', duration: 'min' })[this.effectiveMetric()]);
  readonly tendency = computed(() => trend(this.entries()));
  readonly records = computed(() => bestRecords(this.entries()));
  readonly cardioTotal = computed(() => this.entries().reduce((sum, entry) => sum + entry.seconds, 0));
  readonly exerciseFrequency = computed(() => {
    if (this.periodError()) return { monthly: false, points: [] };
    const ids = new Set(this.entries().map(entry => entry.sessionId));
    return frequency(this.history().filter(session => ids.has(session.id)).map(session => ({ ...session, exercises: session.exercises.filter(exercise => exerciseKey(exercise) === this.selected()?.key) })), this.start(), this.end(), 'cardio');
  });
  readonly showAllSessions = signal(false);
  readonly visibleSessions = computed(() => (this.showAllSessions() ? this.history() : this.history().slice(-10)).slice().reverse());
  readonly setColumns = computed(() => Array.from({ length: Math.max(0, ...this.entries().map(entry => entry.exercise.records.length)) }, (_, index) => index));
  readonly currentId = signal(''); readonly referenceId = signal('');
  readonly current = computed(() => this.entries().find(entry => entry.sessionId === this.currentId()) ?? this.entries().at(-1));
  readonly reference = computed(() => {
    if (this.referenceId() === 'none') return undefined;
    const selected = this.entries().find(entry => entry.sessionId === this.referenceId() && entry.sessionId !== this.current()?.sessionId);
    if (selected) return selected;
    const current = this.current();
    return current ? this.entries().filter(entry => entry.sessionId !== current.sessionId && entry.date <= current.date && compatible(current, entry)).at(-1) : undefined;
  });
  readonly comparison = computed(() => {
    const current = this.current(), reference = this.reference();
    if (!current || !reference) return 'Sem referência';
    if (this.cardio()) return 'Comparação de duração';
    if (current.workoutId !== reference.workoutId) return 'Treinos diferentes';
    if (!compatible(current, reference)) return 'Estruturas diferentes';
    return compare(current, reference);
  });
  readonly highlights = computed(() => {
    const keys = [...new Set(this.history().flatMap(session => session.exercises.map(exerciseKey)))];
    return keys.map(key => ({ key, ...trend(observations(this.history(), key)) })).filter(item => !!item.latest)
      .sort((a, b) => b.latest!.date - a.latest!.date).slice(0, 6);
  });
  chooseExercise(key: string) { this.selectedKey.set(key); this.workoutFilter.set(''); this.structure.set('all'); this.metric.set('weight'); this.load.set(''); this.currentId.set(''); this.referenceId.set(''); }
  openExercise(key: string) { this.chooseExercise(key); this.tab.set('exercise'); window.scrollTo({ top: 0, behavior: 'instant' }); }
  chooseCurrent(id: string) { this.currentId.set(id); this.referenceId.set(''); }
  tone(label: string): 'green' | 'danger' | 'muted' | 'gold' { return label === 'Melhor' ? 'green' : label === 'Abaixo' ? 'danger' : label === 'Resultado misto' ? 'gold' : 'muted'; }
  format(seconds: number) { const total = Math.max(0, Math.round(seconds)); return (total >= 3600 ? Math.floor(total / 3600) + ':' : '') + String(Math.floor(total / 60) % 60).padStart(2, '0') + ':' + String(total % 60).padStart(2, '0'); }
  dayLabel(day: string) { return dayDate(day).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }); }
  groupWidth(sets: number) { return this.stats().groups[0]?.sets ? sets / this.stats().groups[0].sets * 100 : 0; }
  duration(session: Session) { return this.format((session.finishedAt! - session.startedAt) / 1000); }
  seriesLabel(entry: Observation) { return entry.exercise.kind === 'cardio' ? this.format(entry.seconds) : entry.exercise.records.length + (entry.exercise.records.length === 1 ? ' série' : ' séries'); }
}
