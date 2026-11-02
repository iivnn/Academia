export const muscleGroups = ['Peito', 'Costas', 'Ombros', 'Bíceps', 'Tríceps', 'Abdômen', 'Quadríceps', 'Posteriores', 'Glúteos', 'Panturrilhas'] as const;
export type MuscleGroup = typeof muscleGroups[number];
export type ExerciseKind = 'strength' | 'cardio';
export interface ExerciseDefinition { id: string; name: string; muscle?: MuscleGroup; kind?: ExerciseKind; }
export interface Exercise extends ExerciseDefinition { sets: number; restSeconds: number; }
export interface Workout { id: string; name: string; exercises: Exercise[]; }
export interface SetRecord { weight: string; reps: string; done: boolean; }
export interface CardioRecord { startedAt: number | null; elapsedMs: number; completed: boolean; }
export interface SessionExercise extends Exercise { records: SetRecord[]; deferred?: boolean; cardio?: CardioRecord; }
export interface Session {
  id: string; workoutId: string; workoutName: string; startedAt: number;
  finishedAt?: number; restUntil: number | null; currentExercise: number; exercises: SessionExercise[];
}
export interface TrainingState {
  testData?: boolean;
  catalog: ExerciseDefinition[];
  workouts: Workout[]; nextWorkoutId: string | null; active: Session | null;
  history: Session[]; summaryId: string | null;
}
export function emptyTrainingState(): TrainingState {
  return { catalog: [], workouts: [], nextWorkoutId: null, active: null, history: [], summaryId: null };
}
