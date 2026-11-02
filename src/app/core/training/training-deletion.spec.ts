import { expect, it } from 'vitest';
import { deleteCatalogExercise, deleteWorkout } from './exercise-catalog';
import { createSession } from './training.domain';
import { emptyTrainingState } from './training.models';
function fixture() {
  const exercise = { id: 'e', name: 'Remada', muscle: 'Costas' as const };
  const workouts = ['a', 'b', 'c'].map(id => ({ id, name: id, exercises: [{ ...exercise, sets: 3, restSeconds: 60 }] }));
  return { ...emptyTrainingState(), catalog: [exercise], workouts, nextWorkoutId: 'b', history: [{ ...createSession(workouts[0], 100, 's'), finishedAt: 200 }] };
}
it('exclui treino preservando biblioteca, histórico e próximo treino não afetado', () => {
  const state = fixture(), updated = deleteWorkout(state, 'a');
  expect(updated.workouts.map(item => item.id)).toEqual(['b', 'c']);
  expect(updated.nextWorkoutId).toBe('b'); expect(updated.catalog).toBe(state.catalog); expect(updated.history).toBe(state.history);
});
it('ao excluir o próximo treino escolhe o sucessor e volta ao início se necessário', () => {
  expect(deleteWorkout(fixture(), 'b').nextWorkoutId).toBe('c');
  expect(deleteWorkout({ ...fixture(), nextWorkoutId: 'c' }, 'c').nextWorkoutId).toBe('a');
  const only = { ...fixture(), workouts: [fixture().workouts[0]], nextWorkoutId: 'a' };
  expect(deleteWorkout(only, 'a').nextWorkoutId).toBeNull();
});
it('não exclui exercício referenciado e preserva histórico ao remover um exercício livre', () => {
  const state = fixture();
  expect(() => deleteCatalogExercise(state, 'e')).toThrow('Remova este exercício');
  const unreferenced = { ...state, workouts: [] };
  const updated = deleteCatalogExercise(unreferenced, 'e');
  expect(updated.catalog).toEqual([]); expect(updated.history).toBe(state.history);
  expect(updated.history[0].exercises[0].name).toBe('Remada');
});
it('bloqueia exclusão durante treino ativo', () => {
  const state = fixture(), activeState = { ...state, active: createSession(state.workouts[0], 100, 'active') };
  expect(() => deleteWorkout(activeState, 'b')).toThrow('andamento');
  expect(() => deleteCatalogExercise(activeState, 'e')).toThrow('andamento');
});
