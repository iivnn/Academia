import { computed, DestroyRef, Injectable, inject, signal } from '@angular/core';
import { TrainingRepository } from './training.repository';
import { createSession, deferCurrentExercise, finishSession, sessionComplete, updateCardio, validRecord, visitExercise } from './training.domain';
import { emptyTrainingState, ExerciseDefinition, TrainingState, Workout } from './training.models';
import { deleteCatalogExercise, deleteWorkout, resolveWorkout, saveCatalogExercise } from './exercise-catalog';
import { applyRoutineImport, RoutinePlan } from './routine-backup';
import { createTestDataset } from './test-dataset';
@Injectable({ providedIn: 'root' })
export class TrainingStore {
  private readonly repository = inject(TrainingRepository);
  private readonly internal = signal(emptyTrainingState());
  readonly state = this.internal.asReadonly();
  readonly ready = signal(false);
  readonly saving = signal(false);
  readonly error = signal('');
  readonly resetting = signal(false);
  private resetVersion = 0;
  private readonly channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('academia-data-reset') : null;
  private queue: Promise<void> = Promise.resolve();
  private pending = 0;
  readonly next = computed<Workout | undefined>(() => this.state().workouts.find(workout => workout.id === this.state().nextWorkoutId) ?? this.state().workouts[0]);
  constructor() {
    if (this.channel) this.channel.onmessage = event => {
      if (event.data === 'routine-import') { this.resetVersion++; void this.load(); }
      if (event.data === 'reset') {
        this.resetVersion++; this.internal.set(emptyTrainingState()); this.ready.set(true); this.error.set('');
      }
    };
    inject(DestroyRef).onDestroy(() => this.channel?.close());
    void this.load();
  }
  async load() {
    this.error.set('');
    const version = this.resetVersion;
    try { const state = await this.repository.load(); if (version === this.resetVersion) { this.internal.set(state); this.ready.set(true); } }
    catch { this.error.set('Não foi possível abrir seus dados. Tente novamente e verifique o armazenamento do navegador.'); }
  }
  private commit(state: TrainingState): Promise<void> {
    if (this.resetting()) return Promise.resolve();
    const version = this.resetVersion;
    this.internal.set(state);
    this.pending++; this.saving.set(true);
    const operation = this.queue.then(() => version === this.resetVersion ? this.repository.save(state) : undefined);
    this.queue = operation.catch(() => {});
    return operation.then(() => { this.error.set(''); }, () => {
      this.error.set('Não foi possível salvar. Mantenha o app aberto e tente salvar novamente antes de sair.');
    }).finally(() => { this.pending--; this.saving.set(this.pending > 0); });
  }
  retry() { return this.commit(this.state()); }
  async resetAll(): Promise<boolean> {
    if (this.resetting()) return false;
    this.resetting.set(true); this.resetVersion++;
    try {
      await this.queue;
      await this.repository.reset();
      this.internal.set(emptyTrainingState()); this.ready.set(true); this.error.set('');
      this.channel?.postMessage('reset');
      return true;
    } catch {
      this.error.set('Não foi possível apagar os dados. Tente novamente.');
      return false;
    } finally { this.resetting.set(false); }
  }
  async importRoutine(plan: RoutinePlan): Promise<boolean> {
    if (this.resetting()) return false;
    this.resetting.set(true); this.resetVersion++;
    try {
      await this.queue;
      const replacement = applyRoutineImport(this.state(), plan);
      await this.repository.save(replacement);
      this.internal.set(replacement); this.ready.set(true); this.error.set('');
      this.channel?.postMessage('routine-import');
      return true;
    } catch {
      this.error.set('Não foi possível importar. A rotina anterior foi preservada.');
      return false;
    } finally { this.resetting.set(false); }
  }
  async loadTestData(): Promise<boolean> {
    if (this.resetting()) return false;
    this.resetting.set(true); this.resetVersion++;
    try {
      await this.queue;
      const state = createTestDataset();
      await this.repository.replaceAll(state);
      this.internal.set(state); this.ready.set(true); this.error.set('');
      this.channel?.postMessage('routine-import');
      return true;
    } catch {
      this.error.set('Não foi possível carregar a base de testes. Os dados anteriores foram preservados.');
      return false;
    } finally { this.resetting.set(false); }
  }
  saveExercise(exercise: ExerciseDefinition) { return this.commit(saveCatalogExercise(this.state(), exercise)); }
  deleteWorkout(id: string) { return this.commit(deleteWorkout(this.state(), id)); }
  deleteExercise(id: string) { return this.commit(deleteCatalogExercise(this.state(), id)); }
  saveWorkout(workout: Workout) {
    if (this.state().active) throw new Error('Finalize o treino em andamento antes de editar a sequência.');
    const state = this.state();
    workout = resolveWorkout(workout, state.catalog);
    const workouts = state.workouts.some(item => item.id === workout.id)
      ? state.workouts.map(item => item.id === workout.id ? workout : item) : [...state.workouts, workout];
    return this.commit({ ...state, workouts, nextWorkoutId: state.nextWorkoutId ?? workout.id });
  }
  moveWorkout(id: string, direction: number) {
    if (this.state().active) return;
    const workouts = [...this.state().workouts];
    const index = workouts.findIndex(workout => workout.id === id), target = index + direction;
    if (index < 0 || target < 0 || target >= workouts.length) return;
    [workouts[index], workouts[target]] = [workouts[target], workouts[index]];
    void this.commit({ ...this.state(), workouts });
  }
  start() {
    if (this.state().active || !this.next()?.exercises.length) return Promise.resolve();
    return this.commit({ ...this.state(), summaryId: null, active: createSession(this.next()!, Date.now(), crypto.randomUUID()) });
  }
  cardio(action: 'start' | 'pause' | 'finish') {
    const active = this.state().active;
    if (!active) return Promise.resolve();
    return this.commit({ ...this.state(), active: updateCardio(active, active.currentExercise, action, Date.now()) });
  }
  draft(exerciseIndex: number, setIndex: number, key: 'weight' | 'reps', value: string) {
    const state = structuredClone(this.state()), active = state.active;
    const record = active?.exercises[exerciseIndex]?.records[setIndex];
    if (!record || record.done) return;
    record[key] = value; void this.commit(state);
  }
  completeSet(exerciseIndex: number, setIndex: number) {
    const state = structuredClone(this.state()), active = state.active;
    const exercise = active?.exercises[exerciseIndex], record = exercise?.records[setIndex];
    if (!active || !exercise || !record || record.done || !validRecord(record)) return Promise.resolve();
    record.done = true;
    if (exercise.records.every(item => item.done)) exercise.deferred = false;
    active.restUntil = sessionComplete(active) || exercise.restSeconds === 0 ? null : Date.now() + exercise.restSeconds * 1000;
    return this.commit(state);
  }
  reopenSet(exerciseIndex: number, setIndex: number) {
    const state = structuredClone(this.state()), record = state.active?.exercises[exerciseIndex]?.records[setIndex];
    if (!record) return;
    record.done = false; void this.commit(state);
  }
  navigate(index: number) {
    const active = this.state().active;
    if (!active || index < 0 || index >= active.exercises.length) return;
    void this.commit({ ...this.state(), active: visitExercise(active, index) });
  }
  deferExercise() {
    const active = this.state().active;
    if (!active) return Promise.resolve();
    const deferred = deferCurrentExercise(active);
    return deferred === active ? Promise.resolve() : this.commit({ ...this.state(), active: deferred });
  }
  skipRest() { const active = this.state().active; if (active) void this.commit({ ...this.state(), active: { ...active, restUntil: null } }); }
  finish() { return this.commit(finishSession(this.state(), Date.now())); }
  dismissSummary() { void this.commit({ ...this.state(), summaryId: null }); }
}
