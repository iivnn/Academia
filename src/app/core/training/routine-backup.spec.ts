import { expect, it } from 'vitest';
import { applyRoutineImport, createRoutineBackup, readRoutineBackup } from './routine-backup';
import { createSession } from './training.domain';
import { emptyTrainingState, TrainingState } from './training.models';
import { routineBlocks } from './routine-export';
function fixture(): TrainingState {
  const strength = { id: 's', name: 'Supino inclinado', kind: 'strength' as const, muscle: 'Peito' as const };
  const cardio = { id: 'c', name: 'Bicicleta', kind: 'cardio' as const };
  return { ...emptyTrainingState(), catalog: [strength, cardio], nextWorkoutId: 'w', workouts: [{ id: 'w', name: 'Treino completo', exercises: [{ ...strength, sets: 4, restSeconds: 90 }, { ...cardio, sets: 0, restSeconds: 0 }] }] };
}
it('exportação JSON recupera toda a rotina e não inclui sessão ou histórico', () => {
  const state = fixture(); state.active = createSession(state.workouts[0], 1, 'active'); state.history.push(state.active);
  const backup = createRoutineBackup(state);
  const restored = readRoutineBackup(JSON.stringify(backup));
  expect(restored.workouts).toEqual(state.workouts); expect(restored.catalog).toEqual(state.catalog);
  expect(restored.nextWorkoutId).toBe('w'); expect(backup).not.toHaveProperty('active'); expect(backup).not.toHaveProperty('history');
});
it('JSON inválido, versão desconhecida e arquivos grandes são rejeitados', () => {
  expect(() => readRoutineBackup('{')).toThrow('JSON');
  expect(() => readRoutineBackup(JSON.stringify({ ...createRoutineBackup(fixture()), version: 2 }))).toThrow('versão');
  expect(() => readRoutineBackup(' '.repeat(2 * 1024 * 1024 + 1))).toThrow('2 MB');
});
it('valida vínculos, séries, grupos e duplicidades antes de substituir', () => {
  const backup = createRoutineBackup(fixture());
  for (const mutate of [
    (b: typeof backup) => { b.workouts[0].exercises[0].exerciseId = 'missing'; },
    (b: typeof backup) => { b.workouts[0].exercises[0].sets = -1; },
    (b: typeof backup) => { b.catalog.push(b.catalog[0]); },
    (b: typeof backup) => { b.workouts[0].exercises.push(b.workouts[0].exercises[0]); },
    (b: typeof backup) => { b.nextWorkoutId = 'missing'; },
    (b: typeof backup) => { b.workouts[0].exercises[1].sets = 3; },
  ]) { const bad = structuredClone(backup); mutate(bad); expect(() => readRoutineBackup(JSON.stringify(bad))).toThrow(); }
});
it('importação substitui a rotina, encerra a sessão e preserva histórico com IDs novos', () => {
  const original = fixture(); original.active = createSession(original.workouts[0], 1, 'active'); original.history.push({ ...original.active, finishedAt: 100 });
  const before = structuredClone(original); let index = 0;
  const imported = applyRoutineImport(original, readRoutineBackup(JSON.stringify(createRoutineBackup(fixture()))), () => 'new-' + ++index);
  expect(original).toEqual(before); expect(imported.active).toBeNull(); expect(imported.summaryId).toBeNull();
  expect(imported.history).toBe(original.history); expect(imported.workouts[0].id).not.toBe('w');
  expect(imported.workouts[0].exercises[0].id).toBe(imported.catalog[0].id);
  expect(imported.nextWorkoutId).toBe(imported.workouts[0].id);
});
it('documento visual inclui musculação, cardio, sequência e biblioteca', () => {
  const text = routineBlocks(fixture()).map(block => block.text).join('\n');
  expect(text).toContain('Treino completo (próximo)'); expect(text).toContain('4 séries'); expect(text).toContain('90 s');
  expect(text).toContain('Cardio'); expect(text).toContain('BIBLIOTECA');
});
