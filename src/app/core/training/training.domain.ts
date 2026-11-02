import { Session, SessionExercise, SetRecord, TrainingState, Workout } from './training.models';

export function validRecord(record: SetRecord): boolean {
  if (!/^\d+(?:[.,]\d+)?$/.test(record.weight.trim()) || !/^\d+$/.test(record.reps.trim())) return false;
  const weight = Number(record.weight.replace(',', '.'));
  const reps = Number(record.reps);
  return record.weight.trim() !== '' && Number.isFinite(weight) && weight >= 0 && weight <= 10000
    && record.reps.trim() !== '' && Number.isInteger(reps) && reps > 0 && reps <= 10000;
}
export function createSession(workout: Workout, now: number, id: string): Session {
  return {
    id, workoutId: workout.id, workoutName: workout.name, startedAt: now, restUntil: null, currentExercise: 0,
    exercises: workout.exercises.map(exercise => exercise.kind === 'cardio'
      ? { ...exercise, sets: 0, restSeconds: 0, records: [], cardio: { startedAt: null, elapsedMs: 0, completed: false } }
      : { ...exercise, records: Array.from({ length: exercise.sets }, () => ({ weight: '', reps: '', done: false })) }),
  };
}
export function sessionComplete(session: Session): boolean {
  return session.exercises.length > 0 && session.exercises.every(exerciseComplete);
}
export function exerciseComplete(exercise: SessionExercise): boolean {
  if (exercise.kind === 'cardio') return !!exercise.cardio?.completed && exercise.cardio.startedAt === null && Number.isFinite(exercise.cardio.elapsedMs) && exercise.cardio.elapsedMs > 0;
  return exercise.records.length > 0 && exercise.records.every(record => record.done && validRecord(record));
}
export function cardioElapsed(exercise: SessionExercise, now: number): number {
  const record = exercise.cardio;
  return record ? record.elapsedMs + (record.startedAt === null ? 0 : Math.max(0, now - record.startedAt)) : 0;
}
export function updateCardio(session: Session, index: number, action: 'start' | 'pause' | 'finish', now: number): Session {
  const exercise = session.exercises[index];
  if (!exercise || exercise.kind !== 'cardio') return session;
  const current = exercise.cardio ?? { startedAt: null, elapsedMs: 0, completed: false };
  let cardio = { ...current };
  if (action === 'start') {
    if (current.startedAt !== null) return session;
    if (session.exercises.some((item, i) => i !== index && item.cardio?.startedAt != null)) throw new Error('Pause o outro cardio antes de iniciar este.');
    cardio = { ...current, startedAt: now, completed: false };
  } else {
    const elapsedMs = cardioElapsed(exercise, now);
    if (action === 'finish' && elapsedMs <= 0) throw new Error('Inicie o cardio antes de encerrar.');
    cardio = { startedAt: null, elapsedMs, completed: action === 'finish' };
  }
  return { ...session, exercises: session.exercises.map((item, i) => i === index ? { ...item, cardio, deferred: false } : item) };
}
export function nextPendingExercise(session: Session): number {
  for (let offset = 1; offset < session.exercises.length; offset++) {
    const index = (session.currentExercise + offset) % session.exercises.length;
    if (!exerciseComplete(session.exercises[index])) return index;
  }
  return -1;
}
export function visitExercise(session: Session, index: number, now = Date.now()): Session {
  if (index === session.currentExercise || index < 0 || index >= session.exercises.length) return session;
  const current = session.exercises[session.currentExercise];
  if (current.kind === 'cardio' && current.cardio?.startedAt != null) session = updateCardio(session, session.currentExercise, 'pause', now);
  return {
    ...session, currentExercise: index,
    exercises: session.exercises.map((exercise, i) => i === index ? { ...exercise, deferred: false }
      : i === session.currentExercise && !exerciseComplete(exercise) ? { ...exercise, deferred: true } : exercise),
  };
}
export function deferCurrentExercise(session: Session): Session {
  if (exerciseComplete(session.exercises[session.currentExercise])) return session;
  const next = nextPendingExercise(session);
  return next < 0 ? session : visitExercise(session, next);
}
export function finishSession(state: TrainingState, now: number): TrainingState {
  if (!state.active || !sessionComplete(state.active)) throw new Error('Conclua todos os exercícios e séries antes de finalizar.');
  const completed = { ...state.active, finishedAt: now, restUntil: null };
  const position = state.workouts.findIndex(workout => workout.id === completed.workoutId);
  const next = state.workouts.length ? state.workouts[(position + 1) % state.workouts.length].id : null;
  return { ...state, active: null, nextWorkoutId: next, history: [...state.history, completed], summaryId: completed.id };
}
export type Comparison = 'Melhor' | 'Abaixo' | 'Mantido' | 'Resultado misto' | 'Sem referência' | 'Duração registrada';
export function metrics(exercise: SessionExercise) {
  const records = exercise.records.filter(record => record.done && validRecord(record));
  return {
    weight: records.length ? records.reduce((sum, record) => sum + Number(record.weight.replace(',', '.')), 0) / records.length : 0,
    reps: records.reduce((sum, record) => sum + Number(record.reps), 0),
    volume: records.reduce((sum, record) => sum + Number(record.weight.replace(',', '.')) * Number(record.reps), 0),
  };
}
export function compare(current: { weight: number; reps: number }, previous?: { weight: number; reps: number }): Comparison {
  if (!previous) return 'Sem referência';
  const weight = Math.round((current.weight - previous.weight) * 10000);
  const reps = Math.round((current.reps - previous.reps) * 10000);
  if (weight === 0 && reps === 0) return 'Mantido';
  if (weight >= 0 && reps >= 0) return 'Melhor';
  if (weight <= 0 && reps <= 0) return 'Abaixo';
  return 'Resultado misto';
}
export function equivalent(a: Session, b: Session): boolean {
  return a.workoutId === b.workoutId && a.exercises.length === b.exercises.length
    && a.exercises.every(exercise => b.exercises.some(other => other.id === exercise.id && (other.kind ?? 'strength') === (exercise.kind ?? 'strength') && (exercise.kind === 'cardio' || other.sets === exercise.sets)));
}
export function summarize(session: Session, history: Session[]) {
  const previous = history.filter(item => item.id !== session.id && !!item.finishedAt && item.startedAt <= session.startedAt && equivalent(session, item))
    .sort((a, b) => b.startedAt - a.startedAt).slice(0, 3);
  const rows = session.exercises.map(exercise => {
    const cardioReferences = exercise.kind === 'cardio' ? previous.map(item => (item.exercises.find(other => other.id === exercise.id)!.cardio?.elapsedMs ?? 0) / 1000) : [];
    const cardio = exercise.kind === 'cardio' ? { seconds: (exercise.cardio?.elapsedMs ?? 0) / 1000, lastSeconds: cardioReferences[0] as number | undefined, averageSeconds: cardioReferences.length ? cardioReferences.reduce((sum, value) => sum + value, 0) / cardioReferences.length : undefined } : undefined;
    const references = previous.map(item => metrics(item.exercises.find(other => other.id === exercise.id)!));
    const current = metrics(exercise);
    const average = references.length ? {
      weight: references.reduce((sum, item) => sum + item.weight, 0) / references.length,
      reps: references.reduce((sum, item) => sum + item.reps, 0) / references.length,
    } : undefined;
    return { name: exercise.name, cardio, current, last: references[0], average, versusLast: compare(current, references[0]), versusAverage: compare(current, average) };
  });
  const overall = (key: 'versusLast' | 'versusAverage'): Comparison => {
    const results = rows.filter(row => !row.cardio).map(row => row[key]);
    if (!previous.length) return 'Sem referência';
    if (!results.length) return 'Duração registrada';
    if (results.every(result => result === 'Mantido')) return 'Mantido';
    if (results.every(result => result === 'Melhor' || result === 'Mantido')) return 'Melhor';
    if (results.every(result => result === 'Abaixo' || result === 'Mantido')) return 'Abaixo';
    return 'Resultado misto';
  };
  return { rows, count: previous.length, versusLast: overall('versusLast'), versusAverage: overall('versusAverage') };
}
