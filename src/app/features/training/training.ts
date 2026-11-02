import { Component, computed, ElementRef, inject, signal, viewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Badge, Button, Field, Panel } from '../../shared/ui';
import { TrainingStore } from '../../core/training/training.store';
import { ExerciseDefinition, muscleGroups, Workout } from '../../core/training/training.models';
@Component({ selector: 'app-training', imports: [RouterLink, Badge, Button, Field, Panel], templateUrl: './training.html', styleUrl: './training.css' })
export class Training {
  readonly store = inject(TrainingStore);
  readonly muscles = muscleGroups;
  readonly tab = signal<'workouts' | 'exercises'>('workouts');
  readonly editing = signal<Workout | null>(null);
  readonly originalId = signal<string | null>(null);
  readonly catalogDraft = signal<ExerciseDefinition | null>(null);
  readonly catalogEditing = signal(false);
  readonly error = signal('');
  readonly deletion = signal<{ kind: 'workout' | 'exercise'; id: string; name: string } | null>(null);
  readonly deleting = signal(false);
  readonly deleteError = signal('');
  private readonly deleteDialog = viewChild.required<ElementRef<HTMLDialogElement>>('deleteDialog');
  readonly usedBy = computed(() => {
    const target = this.deletion();
    if (!target || target.kind !== 'exercise') return [];
    const names = this.store.state().workouts.filter(workout => workout.exercises.some(exercise => exercise.id === target.id)).map(workout => workout.name);
    const draft = this.editing();
    if (draft?.exercises.some(exercise => exercise.id === target.id)) names.push((draft.name.trim() || 'Treino sem nome') + ' (rascunho)');
    return [...new Set(names)];
  });
  askDelete(kind: 'workout' | 'exercise', id: string, name: string) {
    this.deleteError.set(''); this.deletion.set({ kind, id, name });
    this.deleteDialog().nativeElement.showModal();
  }
  cancelDelete() {
    if (this.deleting()) return;
    this.deleteDialog().nativeElement.close(); this.deletion.set(null);
  }
  async confirmDelete() {
    const target = this.deletion();
    if (!target || this.deleting() || this.usedBy().length) return;
    this.deleting.set(true); this.deleteError.set('');
    try {
      if (target.kind === 'workout') await this.store.deleteWorkout(target.id);
      else await this.store.deleteExercise(target.id);
      if (!this.store.error()) { this.deleteDialog().nativeElement.close(); this.deletion.set(null); }
      else this.deleteError.set(this.store.error());
    } catch (error) { this.deleteError.set(error instanceof Error ? error.message : 'Não foi possível excluir.'); }
    finally { this.deleting.set(false); }
  }
  show(tab: 'workouts' | 'exercises') { this.tab.set(tab); this.error.set(''); }
  create() { this.originalId.set(null); this.error.set(''); this.editing.set({ id: crypto.randomUUID(), name: '', exercises: [] }); }
  edit(workout: Workout) { this.originalId.set(workout.id); this.error.set(''); this.editing.set(structuredClone(workout)); }
  name(name: string) { this.editing.update(workout => workout ? { ...workout, name } : null); }
  change(index: number, key: 'sets' | 'restSeconds', value: string) {
    const draft = structuredClone(this.editing()); if (!draft) return;
    draft.exercises[index][key] = value === '' ? NaN : Number(value); this.editing.set(draft);
  }
  selectExercise(index: number, id: string) {
    const draft = structuredClone(this.editing()), definition = this.store.state().catalog.find(item => item.id === id);
    if (!draft || !definition || draft.exercises.some((item, i) => i !== index && item.id === id)) return;
    const old = draft.exercises[index];
    draft.exercises[index] = { ...old, ...definition, kind: definition.kind, sets: definition.kind === 'cardio' ? 0 : old.sets || 3, restSeconds: definition.kind === 'cardio' ? 0 : old.kind === 'cardio' ? 90 : old.restSeconds }; this.editing.set(draft);
  }
  selectedElsewhere(id: string, index: number) { return this.editing()?.exercises.some((item, i) => i !== index && item.id === id) ?? false; }
  available() { return this.store.state().catalog.some(item => !this.editing()?.exercises.some(selected => selected.id === item.id)); }
  addExercise() {
    const definition = this.store.state().catalog.find(item => !this.editing()?.exercises.some(selected => selected.id === item.id));
    if (definition) this.editing.update(workout => workout ? { ...workout, exercises: [...workout.exercises, { ...definition, sets: definition.kind === 'cardio' ? 0 : 3, restSeconds: definition.kind === 'cardio' ? 0 : 90 }] } : null);
  }
  remove(index: number) { this.editing.update(workout => workout ? { ...workout, exercises: workout.exercises.filter((_, i) => i !== index) } : null); }
  moveExercise(index: number, direction: number) { const draft = structuredClone(this.editing()); if (!draft) return; const target = index + direction; if (target < 0 || target >= draft.exercises.length) return; [draft.exercises[index], draft.exercises[target]] = [draft.exercises[target], draft.exercises[index]]; this.editing.set(draft); }
  totalSets(workout: Workout) { return workout.exercises.reduce((total, exercise) => total + exercise.sets, 0); }
  cardioCount(workout: Workout) { return workout.exercises.filter(exercise => exercise.kind === 'cardio').length; }
  async save(event: Event) {
    event.preventDefault(); const workout = structuredClone(this.editing()); if (!workout) return;
    try { await this.store.saveWorkout(workout); if (!this.store.error()) this.editing.set(null); }
    catch (error) { this.error.set(error instanceof Error ? error.message : 'Não foi possível salvar o treino.'); }
  }
  newCatalogExercise() { this.error.set(''); this.catalogEditing.set(false); this.catalogDraft.set({ id: crypto.randomUUID(), name: '', muscle: 'Peito' }); }
  editCatalogExercise(exercise: ExerciseDefinition) { this.error.set(''); this.catalogEditing.set(true); this.catalogDraft.set({ ...exercise }); }
  catalogName(name: string) { this.catalogDraft.update(draft => draft ? { ...draft, name } : null); }
  catalogMuscle(value: string) { this.catalogDraft.update(draft => draft ? { ...draft, muscle: muscleGroups.find(item => item === value) ?? 'Peito' } : null); }
  catalogKind(value: string) { this.catalogDraft.update(draft => draft ? { ...draft, kind: value === 'cardio' ? 'cardio' : 'strength', muscle: value === 'cardio' ? undefined : draft.muscle ?? 'Peito' } : null); }
  async saveCatalog(event: Event) {
    event.preventDefault(); const draft = this.catalogDraft(); if (!draft) return;
    try { await this.store.saveExercise(draft); if (!this.store.error()) this.catalogDraft.set(null); }
    catch (error) { this.error.set(error instanceof Error ? error.message : 'Não foi possível salvar o exercício.'); }
  }
}
