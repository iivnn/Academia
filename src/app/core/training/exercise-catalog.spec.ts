import { expect, it } from 'vitest';
import { resolveWorkout, saveCatalogExercise, withExerciseCatalog } from './exercise-catalog';
import { createSession } from './training.domain';
import { emptyTrainingState } from './training.models';

it('migra os exercícios existentes sem mudar identificadores ou histórico', () => {
  const legacy = { ...emptyTrainingState(), workouts: [{ id: 'w', name: 'Treino', exercises: [{ id: 'e', name: 'Remada', muscle: 'Costas' as const, sets: 3, restSeconds: 90 }] }] };
  const active = createSession(legacy.workouts[0], 100, 's'); legacy.history.push({ ...active, finishedAt: 200 });
  Reflect.deleteProperty(legacy, 'catalog');
  const migrated = withExerciseCatalog(legacy);
  expect(migrated.catalog).toEqual([{ id: 'e', name: 'Remada', muscle: 'Costas' }]);
  expect(migrated.workouts).toBe(legacy.workouts); expect(migrated.history).toBe(legacy.history);
  expect(withExerciseCatalog(migrated)).toBe(migrated);
});
it('propaga edição para treinos preservando configuração e sessões históricas', () => {
  const definition = { id: 'e', name: 'Remada', muscle: 'Costas' as const };
  const state = { ...emptyTrainingState(), catalog: [definition], workouts: [{ id: 'w', name: 'Treino', exercises: [{ ...definition, sets: 4, restSeconds: 60 }] }] };
  state.history.push({ ...createSession(state.workouts[0], 100, 's'), finishedAt: 200 });
  const updated = saveCatalogExercise(state, { ...definition, name: 'Remada baixa' });
  expect(updated.workouts[0].exercises[0]).toEqual({ ...definition, name: 'Remada baixa', sets: 4, restSeconds: 60 });
  expect(updated.history[0].exercises[0].name).toBe('Remada');
  expect(() => saveCatalogExercise(updated, { ...definition, id: 'new', name: ' remada baixa ' })).toThrow('já está');
});
it('treino só aceita exercícios cadastrados e resolve nome e grupo pela biblioteca', () => {
  const definition = { id: 'e', name: 'Remada', muscle: 'Costas' as const };
  const workout = { id: 'w', name: ' Treino ', exercises: [{ ...definition, name: 'Outro nome', sets: 3, restSeconds: 90 }] };
  expect(resolveWorkout(workout, [definition]).exercises[0].name).toBe('Remada');
  expect(() => resolveWorkout(workout, [])).toThrow('cadastrados');
  expect(() => resolveWorkout({ ...workout, exercises: [...workout.exercises, ...workout.exercises] }, [definition])).toThrow('duas vezes');
});
