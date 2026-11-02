import { ExerciseDefinition, muscleGroups, TrainingState, Workout } from './training.models';

export function withExerciseCatalog(state: TrainingState): TrainingState {
  if (Array.isArray(state.catalog)) return state;
  const catalog = new Map<string, ExerciseDefinition>();
  for (const workout of state.workouts) for (const exercise of workout.exercises) {
    catalog.set(exercise.id, { id: exercise.id, name: exercise.name, muscle: exercise.muscle, ...(exercise.kind ? { kind: exercise.kind } : {}) });
  }
  return { ...state, catalog: [...catalog.values()] };
}

export function saveCatalogExercise(state: TrainingState, exercise: ExerciseDefinition): TrainingState {
  if (state.active) throw new Error('Finalize o treino em andamento antes de editar os exercícios.');
  const normalized = { ...exercise, name: exercise.name.trim(), muscle: exercise.kind === 'cardio' ? undefined : exercise.muscle };
  if (!normalized.name || normalized.name.length > 80 || (normalized.kind !== undefined && !['strength', 'cardio'].includes(normalized.kind)) || (normalized.kind !== 'cardio' && (!normalized.muscle || !muscleGroups.includes(normalized.muscle)))) throw new Error('Informe um nome, tipo e grupo muscular válidos.');
  if (state.catalog.some(item => item.id !== exercise.id && item.name.trim().toLocaleLowerCase('pt-BR') === normalized.name.toLocaleLowerCase('pt-BR') && (item.kind ?? 'strength') === (normalized.kind ?? 'strength') && (normalized.kind === 'cardio' || item.muscle === normalized.muscle))) throw new Error('Este exercício já está cadastrado neste grupo muscular ou tipo.');
  const catalog = state.catalog.some(item => item.id === exercise.id) ? state.catalog.map(item => item.id === exercise.id ? normalized : item) : [...state.catalog, normalized];
  const workouts = state.workouts.map(workout => ({ ...workout, exercises: workout.exercises.map(item => item.id === exercise.id ? { ...item, ...normalized, sets: normalized.kind === 'cardio' ? 0 : item.sets || 3, restSeconds: normalized.kind === 'cardio' ? 0 : item.kind === 'cardio' ? 90 : item.restSeconds } : item) }));
  return { ...state, catalog, workouts };
}

export function resolveWorkout(workout: Workout, catalog: ExerciseDefinition[]): Workout {
  if (!workout.name.trim() || !workout.exercises.length) throw new Error('Informe o nome e selecione pelo menos um exercício.');
  const ids = new Set<string>();
  const exercises = workout.exercises.map(exercise => {
    const definition = catalog.find(item => item.id === exercise.id);
    if (!definition) throw new Error('Selecione apenas exercícios cadastrados.');
    if (ids.has(exercise.id)) throw new Error('O mesmo exercício não pode aparecer duas vezes neste treino.');
    ids.add(exercise.id);
    if (definition.kind === 'cardio') return { ...exercise, ...definition, sets: 0, restSeconds: 0 };
    if (!Number.isInteger(exercise.sets) || exercise.sets < 1 || exercise.sets > 20 || !Number.isInteger(exercise.restSeconds) || exercise.restSeconds < 0 || exercise.restSeconds > 1800) throw new Error('Defina de 1 a 20 séries e descanso de 0 a 1800 segundos.');
    return { ...exercise, ...definition };
  });
  return { ...workout, name: workout.name.trim(), exercises };
}

export function deleteWorkout(state: TrainingState, id: string): TrainingState {
  if (state.active) throw new Error('Finalize o treino em andamento antes de excluir treinos.');
  const index = state.workouts.findIndex(workout => workout.id === id);
  if (index < 0) return state;
  const workouts = state.workouts.filter(workout => workout.id !== id);
  const nextWorkoutId = state.nextWorkoutId === id
    ? workouts[index % Math.max(1, workouts.length)]?.id ?? null
    : state.nextWorkoutId;
  return { ...state, workouts, nextWorkoutId };
}

export function deleteCatalogExercise(state: TrainingState, id: string): TrainingState {
  if (state.active) throw new Error('Finalize o treino em andamento antes de excluir exercícios.');
  if (state.workouts.some(workout => workout.exercises.some(exercise => exercise.id === id))) {
    throw new Error('Remova este exercício dos treinos que o utilizam antes de excluí-lo da biblioteca.');
  }
  return { ...state, catalog: state.catalog.filter(exercise => exercise.id !== id) };
}
