import 'fake-indexeddb/auto';
import { deleteDB } from 'idb';
import { expect, it } from 'vitest';
import { cardioElapsed, createSession, deferCurrentExercise, equivalent, exerciseComplete, finishSession, sessionComplete, summarize, updateCardio, visitExercise } from './training.domain';
import { emptyTrainingState, Workout } from './training.models';
import { resolveWorkout, saveCatalogExercise } from './exercise-catalog';
import { openLocalDatabase } from '../storage/local-database';
const cardio = { id: 'bike', name: 'Bicicleta', muscle: 'Peito' as const, kind: 'cardio' as const };
const strength = { id: 'strength', name: 'Supino', muscle: 'Peito' as const, sets: 1, restSeconds: 0 };
const workout: Workout = { id: 'mixed', name: 'Misto', exercises: [{ ...cardio, sets: 0, restSeconds: 0 }, strength] };

it('cardio não cria séries nem é concluído sem iniciar e encerrar', () => {
  const session = createSession(workout, 1000, 's');
  expect(session.exercises[0].records).toEqual([]);
  expect(exerciseComplete(session.exercises[0])).toBe(false);
  expect(() => updateCardio(session, 0, 'finish', 1000)).toThrow('Inicie');
  expect(sessionComplete(session)).toBe(false);
});
it('mede somente intervalos iniciados e permite pausar e retomar sem duplicar o tempo', () => {
  let session = createSession(workout, 0, 's');
  session = updateCardio(session, 0, 'start', 1000);
  expect(updateCardio(session, 0, 'start', 2000)).toBe(session);
  expect(cardioElapsed(session.exercises[0], 6000)).toBe(5000);
  session = updateCardio(session, 0, 'pause', 6000);
  expect(cardioElapsed(session.exercises[0], 50000)).toBe(5000);
  session = updateCardio(session, 0, 'start', 50000);
  session = updateCardio(session, 0, 'finish', 53000);
  expect(cardioElapsed(session.exercises[0], 90000)).toBe(8000);
  expect(exerciseComplete(session.exercises[0])).toBe(true);
  expect(sessionComplete(session)).toBe(false);
  session.exercises[1].records[0] = { weight: '20', reps: '10', done: true };
  expect(sessionComplete(session)).toBe(true);
  expect(finishSession({ ...emptyTrainingState(), workouts: [workout], active: session }, 60000).history).toHaveLength(1);
});
it('trocar ou adiar cardio em execução pausa o tempo e mantém a pendência', () => {
  const running = updateCardio(createSession(workout, 0, 's'), 0, 'start', 1000);
  const changed = visitExercise(running, 1, 6000);
  expect(changed.exercises[0].cardio?.elapsedMs).toBe(5000);
  expect(changed.exercises[0].cardio?.startedAt).toBeNull();
  expect(changed.exercises[0].deferred).toBe(true);
  expect(exerciseComplete(changed.exercises[0])).toBe(false);
  expect(deferCurrentExercise(running).currentExercise).toBe(1);
});
it('normaliza o cardio na seleção sem validar séries e preserva os registros históricos', () => {
  const resolved = resolveWorkout({ id: 'w', name: 'Cardio', exercises: [{ ...cardio, sets: NaN, restSeconds: NaN }] }, [cardio]);
  expect(resolved.exercises[0].sets).toBe(0); expect(resolved.exercises[0].restSeconds).toBe(0);
  const state = { ...emptyTrainingState(), catalog: [strength], workouts: [{ id: 'w', name: 'Misto', exercises: [strength] }] };
  state.history.push({ ...createSession(state.workouts[0], 1, 'old'), finishedAt: 10 });
  const changed = saveCatalogExercise(state, { ...strength, kind: 'cardio' });
  expect(changed.workouts[0].exercises[0].sets).toBe(0);
  expect(changed.history[0].exercises[0].records).toHaveLength(1);
});
it('resumo compara durações sem classificar mais tempo como melhor e não mistura tipos', () => {
  const plan: Workout = { ...workout, exercises: [workout.exercises[0]] };
  const last = { ...updateCardio(updateCardio(createSession(plan, 0, 'last'), 0, 'start', 1000), 0, 'finish', 61000), finishedAt: 62000 };
  const current = { ...updateCardio(updateCardio(createSession(plan, 100000, 'now'), 0, 'start', 101000), 0, 'finish', 221000), finishedAt: 222000 };
  const summary = summarize(current, [last, current]);
  expect(summary.rows[0].cardio).toEqual({ seconds: 120, lastSeconds: 60, averageSeconds: 60 });
  expect(summary.versusLast).toBe('Duração registrada');
  const changedType = structuredClone(last); changedType.exercises[0].kind = 'strength';
  expect(equivalent(current, changedType)).toBe(false);
});
it('recupera cronômetro em andamento após reabrir o banco', async () => {
  const name = crypto.randomUUID(); const db = await openLocalDatabase(name);
  const state = { ...emptyTrainingState(), catalog: [cardio], workouts: [workout], active: updateCardio(createSession(workout, 0, 's'), 0, 'start', 1000) };
  await db.put('training', state, 'state'); db.close();
  const reopened = await openLocalDatabase(name), recovered = (await reopened.get('training', 'state'))!;
  expect(cardioElapsed(recovered.active!.exercises[0], 61000)).toBe(60000);
  expect(recovered.active!.exercises[0].records).toEqual([]);
  reopened.close(); await deleteDB(name);
});
