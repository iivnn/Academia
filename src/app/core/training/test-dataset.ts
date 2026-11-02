import { createSession } from './training.domain';
import { emptyTrainingState, ExerciseDefinition, Session, TrainingState, Workout } from './training.models';

export const TEST_SESSION_COUNT = 180;
export function createTestDataset(now = Date.now()): TrainingState {
  const definitions: (ExerciseDefinition & { base?: number })[] = [
    { id: 'test-supino', name: 'Supino reto', muscle: 'Peito', base: 30 },
    { id: 'test-inclinado', name: 'Supino inclinado', muscle: 'Peito', base: 16 },
    { id: 'test-ombros', name: 'Desenvolvimento', muscle: 'Ombros', base: 12 },
    { id: 'test-triceps', name: 'Tríceps na polia', muscle: 'Tríceps', base: 20 },
    { id: 'test-puxada', name: 'Puxada frontal', muscle: 'Costas', base: 30 },
    { id: 'test-remada', name: 'Remada baixa', muscle: 'Costas', base: 30 },
    { id: 'test-rosca', name: 'Rosca direta', muscle: 'Bíceps', base: 10 },
    { id: 'test-abdominal', name: 'Abdominal na máquina', muscle: 'Abdômen', base: 15 },
    { id: 'test-agachamento', name: 'Agachamento', muscle: 'Quadríceps', base: 30 },
    { id: 'test-legpress', name: 'Leg press', muscle: 'Quadríceps', base: 80 },
    { id: 'test-flexora', name: 'Mesa flexora', muscle: 'Posteriores', base: 20 },
    { id: 'test-panturrilha', name: 'Panturrilha na máquina', muscle: 'Panturrilhas', base: 25 },
    { id: 'test-bike', name: 'Bicicleta', kind: 'cardio' },
    { id: 'test-esteira', name: 'Esteira', kind: 'cardio' },
  ];
  const catalog: ExerciseDefinition[] = definitions.map(({ base: _base, ...definition }) => definition);
  const workouts: Workout[] = ['A · Peito, ombros e tríceps', 'B · Costas, bíceps e abdômen', 'C · Pernas'].map((name, index) => ({
    id: 'test-workout-' + index, name,
    exercises: [
      ...catalog.slice(index * 4, index * 4 + 4).map((exercise, i) => ({ ...exercise, sets: i === 0 ? 4 : 3, restSeconds: i === 0 ? 90 : 60 })),
      { ...catalog[index === 1 ? 13 : 12], sets: 0, restSeconds: 0 },
    ],
  }));
  const history: Session[] = [];
  for (let index = 0; index < TEST_SESSION_COUNT; index++) {
    const workout = structuredClone(workouts[index % workouts.length]), cycle = Math.floor(index / workouts.length);
    if (cycle < 4) workout.exercises[0].sets = 2;
    const day = new Date(now); day.setDate(day.getDate() - ((TEST_SESSION_COUNT - index - 1) * 2 + 1));
    day.setHours(17 + index % 3, 10 + index * 7 % 40, 0, 0);
    const session = createSession(workout, day.getTime(), 'test-session-' + index);
    let cardioSeconds = 0;
    session.exercises.forEach((exercise, exerciseIndex) => {
      if (exercise.kind === 'cardio') {
        cardioSeconds = 600 + cycle * 9 + (index * 37 % 480);
        exercise.cardio = { startedAt: null, elapsedMs: cardioSeconds * 1000, completed: true };
        return;
      }
      const base = definitions.find(item => item.id === exercise.id)!.base!;
      const phase = Math.floor(cycle / 6), tired = cycle % 11 === 8, increased = cycle > 0 && cycle % 6 === 0;
      exercise.records.forEach((record, setIndex) => {
        const weight = Math.max(2.5, Math.round((base + phase * (exerciseIndex === 0 ? 2.5 : 1.25)) * (tired ? .9 : 1) * 4) / 4);
        const reps = Math.max(5, (increased ? 8 : 10) + (cycle + exerciseIndex) % 3 - Math.floor(setIndex / 2) - (tired ? 2 : 0));
        record.weight = String(weight); record.reps = String(reps); record.done = true;
      });
    });
    session.finishedAt = session.startedAt + ((26 + index % 17) * 60 + cardioSeconds) * 1000;
    history.push(session);
  }
  return { ...emptyTrainingState(), catalog, workouts, history, nextWorkoutId: workouts[0].id, testData: true };
}
