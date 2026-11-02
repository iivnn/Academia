import 'fake-indexeddb/auto';
import { deleteDB } from 'idb';
import { expect, it } from 'vitest';
import { clearLocalData, openLocalDatabase } from './local-database';
import { createSession, updateCardio } from '../training/training.domain';
import { emptyTrainingState, Workout } from '../training/training.models';

it('reset apaga todos os registros locais e permite começar novamente após reabrir', async () => {
  const name = crypto.randomUUID();
  const db = await openLocalDatabase(name);
  const definition = { id: 'bike', name: 'Bicicleta', kind: 'cardio' as const };
  const workout: Workout = { id: 'w', name: 'Meu treino', exercises: [{ ...definition, sets: 0, restSeconds: 0 }] };
  const active = updateCardio(createSession(workout, 100, 'active'), 0, 'start', 1000);
  const history = [{ ...updateCardio(active, 0, 'finish', 61000), id: 'old', finishedAt: 62000 }];
  await db.put('training', { ...emptyTrainingState(), catalog: [definition], workouts: [workout], active, history, nextWorkoutId: 'w', summaryId: 'old' }, 'state');
  await db.put('settings', { key: 'theme', value: 'dark' });
  await db.put('settings', { key: 'initializedAt', value: '100' });
  await clearLocalData(db);
  expect(await db.count('training')).toBe(0); expect(await db.count('settings')).toBe(0);
  db.close();
  const reopened = await openLocalDatabase(name);
  expect(await reopened.get('training', 'state')).toBeUndefined();
  expect(await reopened.getAll('settings')).toEqual([]);
  await reopened.put('training', emptyTrainingState(), 'state');
  expect(await reopened.get('training', 'state')).toEqual(emptyTrainingState());
  reopened.close(); await deleteDB(name);
});
