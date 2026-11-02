import { afterNextRender, Component, computed, DestroyRef, inject, Injector, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DecimalPipe } from '@angular/common';
import { Badge, Button, Field, Panel, Progress } from '../../shared/ui';
import { MuscleMap } from '../../shared/ui/muscle-map';
import { TrainingStore } from '../../core/training/training.store';
import { cardioElapsed, exerciseComplete, nextPendingExercise, sessionComplete, summarize, validRecord } from '../../core/training/training.domain';
import { MuscleGroup, Session, SessionExercise, Workout } from '../../core/training/training.models';
@Component({
  selector: 'app-today', imports: [RouterLink, DecimalPipe, Badge, Button, Field, Panel, Progress, MuscleMap],
  templateUrl: './today.html', styleUrl: './today.css',
})
export class Today {
  readonly store = inject(TrainingStore);
  private readonly injector = inject(Injector);
  readonly now = signal(Date.now());
  readonly working = signal(false);
  readonly message = signal('');
  readonly active = computed(() => this.store.state().active);
  readonly exercise = computed(() => { const active = this.active(); return active?.exercises[active.currentExercise]; });
  readonly currentSet = computed(() => this.exercise()?.records.findIndex(record => !record.done) ?? -1);
  readonly complete = computed(() => !!this.active() && sessionComplete(this.active()!));
  readonly nextPending = computed(() => this.active() ? nextPendingExercise(this.active()!) : -1);
  readonly pendingCount = computed(() => this.active()?.exercises.filter(exercise => !exerciseComplete(exercise)).length ?? 0);
  readonly deferred = computed(() => this.active()?.exercises.map((exercise, index) => ({ exercise, index })).filter(item => item.exercise.deferred && !exerciseComplete(item.exercise)) ?? []);
  readonly rest = computed(() => Math.max(0, Math.ceil(((this.active()?.restUntil ?? 0) - this.now()) / 1000)));
  readonly elapsed = computed(() => Math.max(0, Math.floor((this.now() - (this.active()?.startedAt ?? this.now())) / 1000)));
  readonly progress = computed(() => {
    let total = 0, done = 0;
    for (const exercise of this.active()?.exercises ?? []) {
      total += exercise.kind === 'cardio' ? 1 : exercise.records.length;
      done += exercise.kind === 'cardio' ? Number(exerciseComplete(exercise)) : exercise.records.filter(record => record.done).length;
    }
    return total ? Math.round(done / total * 100) : 0;
  });
  readonly cardioSeconds = computed(() => this.exercise() ? cardioElapsed(this.exercise()!, this.now()) / 1000 : 0);
  readonly completed = computed(() => this.store.state().history.find(session => session.id === this.store.state().summaryId));
  readonly summary = computed(() => { const completed = this.completed(); return completed ? summarize(completed, this.store.state().history) : null; });
  readonly reference = computed(() => {
    const active = this.active(), exercise = this.exercise(); if (!active || !exercise) return undefined;
    return [...this.store.state().history].reverse().find(session => session.workoutId === active.workoutId && session.exercises.some(other => other.id === exercise.id && (other.kind ?? 'strength') === (exercise.kind ?? 'strength') && (exercise.kind === 'cardio' || other.sets === exercise.sets)))?.exercises.find(other => other.id === exercise.id);
  });
  constructor() {
    const tick = () => this.now.set(Date.now());
    const interval = window.setInterval(tick, 500);
    document.addEventListener('visibilitychange', tick);
    inject(DestroyRef).onDestroy(() => { window.clearInterval(interval); document.removeEventListener('visibilitychange', tick); });
  }
  muscles(workout: Workout | Session) { return [...new Set(workout.exercises.filter(exercise => exercise.kind !== 'cardio').map(exercise => exercise.muscle).filter((muscle): muscle is MuscleGroup => !!muscle))]; }
  sets(workout: Workout) { return workout.exercises.filter(exercise => exercise.kind !== 'cardio').reduce((total, exercise) => total + exercise.sets, 0); }
  cardioCount(workout: Workout) { return workout.exercises.filter(exercise => exercise.kind === 'cardio').length; }
  cardio(action: 'start' | 'pause' | 'finish') { void this.action(() => this.store.cardio(action)); }
  format(seconds: number) { const total = Math.max(0, Math.floor(seconds)); const h = Math.floor(total / 3600); return (h ? h + ':' : '') + String(Math.floor(total / 60) % 60).padStart(2, '0') + ':' + String(total % 60).padStart(2, '0'); }
  duration(session: Session) { return this.format(((session.finishedAt ?? this.now()) - session.startedAt) / 1000); }
  async action(operation: () => Promise<void>) { if (this.working()) return; this.working.set(true); this.message.set(''); try { await operation(); } catch (error) { this.message.set(error instanceof Error ? error.message : 'Não foi possível concluir a ação.'); } finally { this.now.set(Date.now()); this.working.set(false); } }
  private top() { afterNextRender(() => window.scrollTo({ top: 0, behavior: 'instant' }), { injector: this.injector }); }
  start() { void this.action(async () => { await this.store.start(); this.top(); }); }
  finish() { void this.action(async () => { await this.store.finish(); this.top(); }); }
  dismissSummary() { this.store.dismissSummary(); this.top(); }
  completeSet(index: number) {
    const active = this.active(), record = this.exercise()?.records[index];
    if (!active || !record || this.rest() > 0) return;
    if (!validRecord(record)) { this.message.set('Informe uma carga de 0 a 10000 kg e um número inteiro de 1 a 10000 repetições. Use 0 kg para exercícios sem carga externa.'); return; }
    void this.action(() => this.store.completeSet(active.currentExercise, index));
  }
  navigate(index: number) { this.message.set(''); this.store.navigate(index); this.top(); }
  defer() { void this.action(async () => { await this.store.deferExercise(); this.top(); }); }
  done(exercise: SessionExercise) { return exerciseComplete(exercise); }
  exerciseDone() { return this.exercise() ? exerciseComplete(this.exercise()!) : false; }
  isLast() { const active = this.active(); return !!active && active.currentExercise === active.exercises.length - 1; }
}
