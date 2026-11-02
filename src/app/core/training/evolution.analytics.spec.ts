import { expect, it } from 'vitest';
import { activityDays, bestRecords, chartPoints, completedHistory, exerciseKey, exerciseOptions, filterHistory, frequency, localDay, observations, overview, shiftDay, trend, validDay } from './evolution.analytics';
import { createSession, updateCardio } from './training.domain';
import { Session, Workout } from './training.models';
const workout: Workout = { id: 'w', name: 'Treino', exercises: [{ id: 's', name: 'Supino', muscle: 'Peito', sets: 2, restSeconds: 60 }] };
const date = (day: number) => new Date(2026, 10, day, 12).getTime();
function session(id: string, day: number, weight: string, reps: string): Session {
  const value = createSession(workout, date(day) - 600000, id);
  value.finishedAt = date(day); value.exercises[0].records = [{ weight, reps, done: true }, { weight, reps, done: true }]; return value;
}
it('somente sessões completas entram na análise e o período inclui as bordas locais', () => {
  const first = session('a', 1, '20', '10'), second = session('b', 2, '22,5', '10'), partial = session('p', 3, '20', '10'); partial.exercises[0].records[0].done = false;
  const active = createSession(workout, date(4), 'active');
  expect(completedHistory([second, partial, active, first]).map(item => item.id)).toEqual(['a', 'b']);
  expect(filterHistory([first, second], '2026-11-02', '2026-11-02').map(item => item.id)).toEqual(['b']);
  expect(localDay(date(1))).toBe('2026-11-01'); expect(shiftDay('2026-11-01', -1)).toBe('2026-10-31');
  expect(validDay('2026-02-30')).toBe(false); expect(validDay('2026-11-02')).toBe(true);
});
it('métricas e repetições na mesma carga não inventam zeros em sessões sem esse peso', () => {
  const entries = observations([session('a', 1, '20', '10'), session('b', 2, '22,5', '12')], 's|strength');
  expect(entries[0].volume).toBe(400); expect(entries[1].weight).toBe(22.5); expect(entries[1].reps).toBe(24);
  const points = chartPoints(entries, 'sameLoad', 20);
  expect(points).toHaveLength(1); expect(points[0].value).toBe(20); expect(points[0].note).toContain('2 série');
  expect(chartPoints(entries, 'weight', 0).map(point => point.value)).toEqual([20, 22.5]);
  expect(bestRecords(entries).weight?.weight).toBe(22.5); expect(bestRecords(entries).reps?.reps).toBe(12);
});
it('tendência usa no máximo três referências do mesmo treino e estrutura', () => {
  const history = [session('a', 1, '10', '10'), session('b', 2, '20', '10'), session('c', 3, '30', '10'), session('d', 4, '40', '10'), session('e', 5, '50', '10')];
  const other = session('other', 4, '999', '10'); other.workoutId = 'other'; history.splice(4, 0, other);
  const structure = session('different-sets', 4, '999', '10'); structure.exercises[0].records.push({ weight: '999', reps: '10', done: true }); history.splice(4, 0, structure);
  const result = trend(observations(history, 's|strength'));
  expect(result.count).toBe(3); expect(result.average?.weight).toBe(30); expect(result.versusAverage).toBe('Melhor');
  expect(result.previous?.sessionId).toBe('d');
});
it('mantém históricos arquivados e separa tipos e IDs de rotinas importadas', () => {
  const history = [session('a', 1, '20', '10')];
  const catalog = [{ id: 'new', name: 'Supino', muscle: 'Peito' as const }, { id: 's', name: 'Supino', kind: 'cardio' as const }];
  const options = exerciseOptions(catalog, history);
  expect(options).toHaveLength(3); expect(options.find(item => item.key === 's|strength')?.archived).toBe(true);
  expect(exerciseKey(catalog[1])).toBe('s|cardio'); expect(observations(history, 'new|strength')).toEqual([]);
});
it('visão geral soma séries e cardio separadamente e conta dias ativos', () => {
  const strength = session('a', 2, '20', '10');
  const cardioPlan: Workout = { id: 'c', name: 'Cardio', exercises: [{ id: 'bike', name: 'Bike', kind: 'cardio', sets: 0, restSeconds: 0 }] };
  const cardio = updateCardio(updateCardio(createSession(cardioPlan, date(2), 'c'), 0, 'start', date(2)), 0, 'finish', date(2) + 600000); cardio.finishedAt = date(2) + 600000;
  const stats = overview([strength, cardio]);
  expect(stats.sessions).toBe(2); expect(stats.activeDays).toBe(1); expect(stats.sets).toBe(2); expect(stats.cardioSeconds).toBe(600);
  expect(stats.groups.map(group => group.name)).toEqual(['Peito']);
  const entries = observations([cardio], 'bike|cardio');
  expect(chartPoints(entries, 'duration', 0)[0].value).toBe(10); expect(bestRecords(entries).duration?.seconds).toBe(600);
  expect(trend(entries).versusLast).toBe('Sem referência');
  const next = structuredClone(cardio); next.id = 'next'; next.finishedAt = date(3); next.exercises[0].cardio!.elapsedMs = 1200000;
  const cardioTrend = trend(observations([cardio, next], 'bike|cardio'));
  expect(cardioTrend.versusLast).toBe('Duração registrada'); expect(cardioTrend.average?.seconds).toBe(600);
});
it('calendário mostra lacunas e frequência agrupa por semana ou mês', () => {
  const history = [session('a', 2, '20', '10'), session('b', 4, '20', '10')];
  const days = activityDays(history, '2026-11-05', '2026-11-02');
  expect(days.map(day => day.count)).toEqual([1, 0, 1, 0]);
  const weeks = frequency(history, '2026-11-02', '2026-11-16');
  expect(weeks.monthly).toBe(false); expect(weeks.points.map(point => point.value)).toEqual([2, 0, 0]);
  expect(frequency(history, '2026-01-01', '2026-11-30').monthly).toBe(true);
});
it('não classifica mais peso com menos repetições como melhora clara', () => {
  const entries = observations([session('a', 1, '20', '12'), session('b', 2, '25', '8')], 's|strength');
  expect(trend(entries).versusLast).toBe('Resultado misto');
  expect(trend(entries.slice(0, 1)).versusLast).toBe('Sem referência');
});
