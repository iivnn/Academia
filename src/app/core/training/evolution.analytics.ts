import { compare, exerciseComplete, metrics, sessionComplete } from './training.domain';
import { ExerciseDefinition, MuscleGroup, Session, SessionExercise } from './training.models';

export interface Observation {
  sessionId: string; workoutId: string; workoutName: string; date: number; exercise: SessionExercise;
  weight: number; maxWeight: number; reps: number; volume: number; seconds: number;
}
export interface ChartPoint { date: number; value: number; note?: string; }
export function exerciseKey(exercise: ExerciseDefinition): string { return `${exercise.id}|${exercise.kind ?? 'strength'}`; }
export function localDay(time: number): string {
  const date = new Date(time);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
export function dayDate(day: string): Date { const [y, m, d] = day.split('-').map(Number); return new Date(y, m - 1, d); }
export function validDay(day: string): boolean { return /^\d{4}-\d{2}-\d{2}$/.test(day) && localDay(dayDate(day).getTime()) === day; }
export function shiftDay(day: string, amount: number): string { const date = dayDate(day); date.setDate(date.getDate() + amount); return localDay(date.getTime()); }
export function completedHistory(history: Session[]): Session[] {
  return history.filter(session => Number.isFinite(session.finishedAt) && session.finishedAt! >= session.startedAt && sessionComplete(session))
    .slice().sort((a, b) => a.finishedAt! - b.finishedAt! || a.id.localeCompare(b.id));
}
export function filterHistory(history: Session[], start: string, end: string): Session[] {
  return history.filter(session => { const day = localDay(session.finishedAt!); return (!start || day >= start) && day <= end; });
}
export function exerciseOptions(catalog: ExerciseDefinition[], history: Session[]) {
  const options = new Map<string, { key: string; exercise: ExerciseDefinition; archived: boolean }>();
  for (const session of history) for (const exercise of session.exercises) options.set(exerciseKey(exercise), { key: exerciseKey(exercise), exercise, archived: true });
  for (const exercise of catalog) options.set(exerciseKey(exercise), { key: exerciseKey(exercise), exercise, archived: false });
  const names = [...options.values()].map(item => item.exercise.name);
  return [...options.values()].map(item => ({ ...item, label: `${item.exercise.name} · ${item.exercise.kind === 'cardio' ? 'Cardio' : item.exercise.muscle ?? 'Musculação'}${item.archived ? ' · histórico' : ''}${names.filter(name => name === item.exercise.name).length > 1 ? ' · ' + item.exercise.id.slice(-6) : ''}` }))
    .sort((a, b) => a.exercise.name.localeCompare(b.exercise.name, 'pt-BR') || a.key.localeCompare(b.key));
}
export function observations(history: Session[], key: string, workoutId = ''): Observation[] {
  return history.filter(session => !workoutId || session.workoutId === workoutId).flatMap(session => {
    const exercise = session.exercises.find(item => exerciseKey(item) === key && exerciseComplete(item));
    if (!exercise) return [];
    const values = metrics(exercise);
    return [{ sessionId: session.id, workoutId: session.workoutId, workoutName: session.workoutName, date: session.finishedAt!, exercise,
      ...values, maxWeight: exercise.records.length ? Math.max(...exercise.records.map(record => Number(record.weight.replace(',', '.')))) : 0,
      seconds: (exercise.cardio?.elapsedMs ?? 0) / 1000 }];
  });
}
export function compatible(a: Observation, b: Observation): boolean {
  return exerciseKey(a.exercise) === exerciseKey(b.exercise) && a.workoutId === b.workoutId
    && (a.exercise.kind === 'cardio' || a.exercise.records.length === b.exercise.records.length && a.exercise.muscle === b.exercise.muscle);
}
export function trend(entries: Observation[]) {
  const latest = entries.at(-1);
  const references = latest ? entries.slice(0, -1).filter(item => compatible(latest, item)).slice(-3).reverse() : [];
  const average = references.length ? {
    weight: references.reduce((sum, item) => sum + item.weight, 0) / references.length,
    reps: references.reduce((sum, item) => sum + item.reps, 0) / references.length,
    seconds: references.reduce((sum, item) => sum + item.seconds, 0) / references.length,
  } : undefined;
  return { latest, previous: references[0] as Observation | undefined, count: references.length, average,
    versusLast: latest?.exercise.kind === 'cardio' ? references.length ? 'Duração registrada' : 'Sem referência' : latest ? compare(latest, references[0]) : 'Sem referência',
    versusAverage: latest?.exercise.kind === 'cardio' ? references.length ? 'Duração registrada' : 'Sem referência' : latest ? compare(latest, average) : 'Sem referência' };
}
export type Metric = 'weight' | 'reps' | 'volume' | 'sameLoad' | 'duration';
export function chartPoints(entries: Observation[], metric: Metric, load: number): ChartPoint[] {
  return entries.flatMap(entry => {
    if (metric === 'duration') return [{ date: entry.date, value: entry.seconds / 60 }];
    if (metric === 'sameLoad') {
      const records = entry.exercise.records.filter(record => Number(record.weight.replace(',', '.')) === load);
      return records.length ? [{ date: entry.date, value: records.reduce((sum, record) => sum + Number(record.reps), 0), note: `${records.length} série(s) a ${load} kg` }] : [];
    }
    return [{ date: entry.date, value: metric === 'weight' ? entry.maxWeight : metric === 'reps' ? entry.reps : entry.volume, note: `${entry.exercise.records.length} série(s)` }];
  });
}
export function bestRecords(entries: Observation[]) {
  const largest = <T>(items: T[], value: (item: T) => number): T | undefined => items.reduce<T | undefined>((best, item) => !best || value(item) > value(best) ? item : best, undefined);
  const sets = entries.flatMap(entry => entry.exercise.records.map(record => ({ date: entry.date, weight: Number(record.weight.replace(',', '.')), reps: Number(record.reps) })));
  return { weight: largest(sets, item => item.weight), reps: largest(sets, item => item.reps), volume: largest(entries, item => item.volume), duration: largest(entries, item => item.seconds) };
}
export function overview(history: Session[]) {
  const groups = new Map<MuscleGroup, { name: MuscleGroup; sets: number; last: number }>();
  let sets = 0, cardioSeconds = 0, durationSeconds = 0;
  for (const session of history) {
    durationSeconds += Math.max(0, (session.finishedAt! - session.startedAt) / 1000);
    for (const exercise of session.exercises) {
      if (exercise.kind === 'cardio') { cardioSeconds += (exercise.cardio?.elapsedMs ?? 0) / 1000; continue; }
      sets += exercise.records.length;
      if (exercise.muscle) {
        const group = groups.get(exercise.muscle) ?? { name: exercise.muscle, sets: 0, last: 0 };
        group.sets += exercise.records.length; group.last = Math.max(group.last, session.finishedAt!); groups.set(exercise.muscle, group);
      }
    }
  }
  return { sessions: history.length, activeDays: new Set(history.map(session => localDay(session.finishedAt!))).size,
    sets, cardioSeconds, durationSeconds, averageDuration: history.length ? durationSeconds / history.length : 0,
    groups: [...groups.values()].sort((a, b) => b.sets - a.sets) };
}
export function activityDays(history: Session[], end: string, start = '') {
  const first = start && start > shiftDay(end, -83) ? start : shiftDay(end, -83);
  const counts = new Map<string, number>();
  for (const session of history) { const key = localDay(session.finishedAt!); counts.set(key, (counts.get(key) ?? 0) + 1); }
  const days: { day: string; count: number }[] = [];
  for (let day = first; day <= end; day = shiftDay(day, 1)) days.push({ day, count: counts.get(day) ?? 0 });
  return days;
}
export function frequency(history: Session[], start: string, end: string, metric: 'sessions' | 'cardio' = 'sessions') {
  const first = start || (history.length ? localDay(history[0].finishedAt!) : end);
  const monthly = dayDate(end).getTime() - dayDate(first).getTime() > 140 * 86400000;
  const bucket = (day: string) => {
    if (monthly) return day.slice(0, 7) + '-01';
    const date = dayDate(day); return shiftDay(day, -((date.getDay() + 6) % 7));
  };
  const values = new Map<string, number>();
  for (let key = bucket(first); key <= end;) {
    values.set(key, 0);
    if (monthly) { const date = dayDate(key); date.setMonth(date.getMonth() + 1); key = localDay(date.getTime()); }
    else key = shiftDay(key, 7);
  }
  for (const session of history) {
    const key = bucket(localDay(session.finishedAt!));
    const value = metric === 'sessions' ? 1 : session.exercises.filter(exercise => exercise.kind === 'cardio').reduce((sum, exercise) => sum + (exercise.cardio?.elapsedMs ?? 0) / 60000, 0);
    values.set(key, (values.get(key) ?? 0) + value);
  }
  return { monthly, points: [...values].map(([day, value]) => ({ date: dayDate(day).getTime(), value })) };
}
