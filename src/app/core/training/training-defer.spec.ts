import 'fake-indexeddb/auto';
import { deleteDB } from 'idb';
import { expect, it } from 'vitest';
import { openLocalDatabase } from '../storage/local-database';
import { createSession, deferCurrentExercise, finishSession, nextPendingExercise, sessionComplete, visitExercise } from './training.domain';
import { emptyTrainingState, Workout } from './training.models';
const workout: Workout = { id: 'a', name: 'Treino', exercises: ['a', 'b', 'c'].map(id => ({ id, name: id, muscle: 'Peito', sets: 2, restSeconds: 60 })) };
const done = { weight: '20', reps: '10', done: true };

it('adiar preserva séries e rascunhos e não muda a ordem do treino', () => {
  const original = createSession(workout, 100, 's');
  original.exercises[0].records[0] = { ...done };
  original.exercises[0].records[1] = { weight: '22,5', reps: '', done: false };
  original.restUntil = 99999;
  const deferred = deferCurrentExercise(original);
  expect(deferred.currentExercise).toBe(1); expect(deferred.exercises[0].deferred).toBe(true);
  expect(deferred.exercises[0].records).toEqual(original.exercises[0].records);
  expect(deferred.restUntil).toBe(99999); expect(deferred.startedAt).toBe(100);
  expect(deferred.exercises.map(exercise => exercise.id)).toEqual(['a', 'b', 'c']);
  expect(original.currentExercise).toBe(0); expect(original.exercises[0].deferred).toBeUndefined();
  expect(sessionComplete(deferred)).toBe(false);
});
it('ao concluir os outros exercícios encontra a pendência anterior e bloqueia finalizar', () => {
  let session = deferCurrentExercise(createSession(workout, 100, 's'));
  session.exercises[1].records = [{ ...done }, { ...done }];
  session.exercises[2].records = [{ ...done }, { ...done }];
  session = visitExercise(session, 2);
  expect(nextPendingExercise(session)).toBe(0);
  expect(() => finishSession({ ...emptyTrainingState(), workouts: [workout], nextWorkoutId: 'a', active: session }, 200)).toThrow('Conclua');
  session = visitExercise(session, 0);
  expect(session.exercises[0].deferred).toBe(false);
  expect(nextPendingExercise(session)).toBe(-1);
  expect(deferCurrentExercise(session)).toBe(session);
  session.exercises[0].records = [{ ...done }, { ...done }];
  expect(sessionComplete(session)).toBe(true);
});
it('navegação direta marca exercício incompleto como pendente para depois', () => {
  const session = createSession(workout, 100, 's');
  const updated = visitExercise(session, 2);
  expect(updated.currentExercise).toBe(2); expect(updated.exercises[0].deferred).toBe(true);
  expect(visitExercise(updated, 20)).toBe(updated);
  expect(nextPendingExercise(updated)).toBe(0);
});
it('recupera exercícios adiados e séries após fechar o banco', async () => {
  const name = crypto.randomUUID();
  const db = await openLocalDatabase(name);
  const state = { ...emptyTrainingState(), workouts: [workout], nextWorkoutId: 'a', active: deferCurrentExercise(createSession(workout, 100, 's')) };
  await db.put('training', state, 'state'); db.close();
  const reopened = await openLocalDatabase(name), recovered = (await reopened.get('training', 'state'))!;
  expect(recovered.active?.currentExercise).toBe(1); expect(recovered.active?.exercises[0].deferred).toBe(true);
  expect(recovered.nextWorkoutId).toBe('a'); expect(recovered.history).toHaveLength(0);
  reopened.close(); await deleteDB(name);
});
