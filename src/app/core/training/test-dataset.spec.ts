import 'fake-indexeddb/auto';
import { deleteDB } from 'idb';
import { expect, it } from 'vitest';
import { openLocalDatabase, replaceLocalData } from '../storage/local-database';
import { createTestDataset, TEST_SESSION_COUNT } from './test-dataset';
import { sessionComplete } from './training.domain';
import { completedHistory, exerciseKey, observations, overview, trend } from './evolution.analytics';
import { resolveWorkout } from './exercise-catalog';
import { emptyTrainingState } from './training.models';

const now = new Date(2026, 10, 2, 12).getTime();
it('gera base grande, válida, determinística e com datas passadas', () => {
  const state = createTestDataset(now);
  expect(state).toEqual(createTestDataset(now));
  expect(state.history).toHaveLength(TEST_SESSION_COUNT); expect(state.catalog).toHaveLength(14); expect(state.workouts).toHaveLength(3);
  expect(state.testData).toBe(true); expect(state.active).toBeNull(); expect(state.summaryId).toBeNull();
  expect(state.history.every(sessionComplete)).toBe(true);
  expect(state.history.every(session => session.finishedAt! < now && session.finishedAt! > session.startedAt)).toBe(true);
  expect(new Set(state.history.map(session => session.id)).size).toBe(TEST_SESSION_COUNT);
  for (const workout of state.workouts) expect(resolveWorkout(workout, state.catalog)).toEqual(workout);
});
it('alimenta gráficos e comparações com cargas, estruturas, cardio e resultados variados', () => {
  const state = createTestDataset(now), history = completedHistory(state.history);
  const stats = overview(history);
  expect(stats.sessions).toBe(180); expect(stats.sets).toBeGreaterThan(2000); expect(stats.cardioSeconds).toBeGreaterThan(100000);
  expect(stats.groups.length).toBeGreaterThanOrEqual(8);
  const key = exerciseKey(state.catalog[0]), entries = observations(history, key);
  expect(entries).toHaveLength(60); expect(new Set(entries.map(entry => entry.exercise.sets)).size).toBe(2);
  expect(new Set(entries.map(entry => entry.weight)).size).toBeGreaterThan(10);
  const results = new Set(entries.map((_, index) => trend(entries.slice(0, index + 1)).versusLast));
  expect(results.has('Melhor')).toBe(true); expect(results.has('Abaixo')).toBe(true); expect(results.has('Resultado misto')).toBe(true);
});
it('substitui dados e preferências em uma gravação e recupera a base ao reabrir', async () => {
  const name = crypto.randomUUID(), db = await openLocalDatabase(name);
  await db.put('training', emptyTrainingState(), 'old-key');
  await db.put('settings', { key: 'old-setting', value: 'apagar' });
  const state = createTestDataset(now); await replaceLocalData(db, state); db.close();
  const reopened = await openLocalDatabase(name);
  expect(await reopened.getAllKeys('training')).toEqual(['state']); expect(await reopened.count('settings')).toBe(0);
  expect((await reopened.get('training', 'state'))?.history).toHaveLength(180);
  reopened.close(); await deleteDB(name);
});
