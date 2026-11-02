import { ExerciseDefinition, muscleGroups, TrainingState, Workout } from './training.models';

export interface RoutinePlan { catalog: ExerciseDefinition[]; workouts: Workout[]; nextWorkoutId: string | null; }
export interface RoutineBackup {
  format: 'academia-routine'; version: 1; exportedAt: string;
  catalog: ExerciseDefinition[];
  workouts: { id: string; name: string; exercises: { exerciseId: string; sets: number; restSeconds: number }[] }[];
  nextWorkoutId: string | null;
}
export const MAX_BACKUP_BYTES = 2 * 1024 * 1024;
export function createRoutineBackup(state: RoutinePlan, now = new Date()): RoutineBackup {
  return {
    format: 'academia-routine', version: 1, exportedAt: now.toISOString(),
    catalog: state.catalog.map(item => ({ id: item.id, name: item.name, kind: item.kind ?? 'strength', ...(item.kind !== 'cardio' ? { muscle: item.muscle } : {}) })),
    workouts: state.workouts.map(workout => ({ id: workout.id, name: workout.name, exercises: workout.exercises.map(item => ({ exerciseId: item.id, sets: item.kind === 'cardio' ? 0 : item.sets, restSeconds: item.kind === 'cardio' ? 0 : item.restSeconds })) })),
    nextWorkoutId: state.nextWorkoutId,
  };
}
function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Estrutura inválida no JSON.');
  return value as Record<string, unknown>;
}
function text(value: unknown, label: string, limit = 80): string {
  if (typeof value !== 'string' || !value.trim() || value.length > limit) throw new Error(`${label} inválido.`);
  return value.trim();
}
function list(value: unknown, label: string, min: number, max: number): unknown[] {
  if (!Array.isArray(value) || value.length < min || value.length > max) throw new Error(`${label}: quantidade inválida (${min} a ${max}).`);
  return value;
}
function integer(value: unknown, min: number, max: number, label: string): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < min || value > max) throw new Error(`${label} inválido.`);
  return value;
}
export function readRoutineBackup(content: string): RoutinePlan {
  if (new TextEncoder().encode(content).length > MAX_BACKUP_BYTES) throw new Error('O arquivo deve ter no máximo 2 MB.');
  let value: unknown;
  try { value = JSON.parse(content.replace(/^\uFEFF/, '')); } catch { throw new Error('Não foi possível ler o JSON. Verifique se o arquivo está completo.'); }
  const data = object(value);
  if (data['format'] !== 'academia-routine' || data['version'] !== 1) throw new Error('Use um JSON de rotina exportado pelo Academia (versão 1).');
  const ids = new Set<string>();
  const catalog = list(data['catalog'], 'Biblioteca de exercícios', 1, 500).map(raw => {
    const item = object(raw), id = text(item['id'], 'Identificador de exercício', 100), name = text(item['name'], 'Nome de exercício');
    if (ids.has(id)) throw new Error('Há identificadores de exercícios duplicados.'); ids.add(id);
    if (item['kind'] === 'cardio') return { id, name, kind: 'cardio' as const };
    if (item['kind'] !== 'strength') throw new Error('Tipo de exercício inválido.');
    const muscle = muscleGroups.find(group => group === item['muscle']);
    if (!muscle) throw new Error(`Grupo muscular inválido: ${name}.`);
    return { id, name, kind: 'strength' as const, muscle };
  });
  const workoutIds = new Set<string>();
  const workouts = list(data['workouts'], 'Treinos', 1, 100).map(raw => {
    const item = object(raw), id = text(item['id'], 'Identificador de treino', 100), name = text(item['name'], 'Nome de treino');
    if (workoutIds.has(id)) throw new Error('Há identificadores de treinos duplicados.'); workoutIds.add(id);
    const used = new Set<string>();
    const exercises = list(item['exercises'], 'Exercícios por treino', 1, 30).map(rawExercise => {
      const entry = object(rawExercise), exerciseId = text(entry['exerciseId'], 'Referência de exercício', 100);
      const definition = catalog.find(exercise => exercise.id === exerciseId);
      if (!definition) throw new Error(`O treino ${name} referencia um exercício que não existe na biblioteca.`);
      if (used.has(exerciseId)) throw new Error(`Há exercícios repetidos no treino ${name}.`); used.add(exerciseId);
      if (definition.kind === 'cardio') {
        if (entry['sets'] !== 0 || entry['restSeconds'] !== 0) throw new Error('Cardio deve ter séries e descanso iguais a zero no JSON.');
        return { ...definition, sets: 0, restSeconds: 0 };
      }
      return { ...definition, sets: integer(entry['sets'], 1, 20, 'Número de séries'), restSeconds: integer(entry['restSeconds'], 0, 1800, 'Descanso') };
    });
    return { id, name, exercises };
  });
  const next = data['nextWorkoutId'];
  if (next !== null && (typeof next !== 'string' || !workoutIds.has(next))) throw new Error('O próximo treino não existe na sequência importada.');
  return { catalog, workouts, nextWorkoutId: typeof next === 'string' ? next : workouts[0].id };
}
export function applyRoutineImport(state: TrainingState, plan: RoutinePlan, uuid = () => crypto.randomUUID()): TrainingState {
  const exerciseIds = new Map(plan.catalog.map(item => [item.id, uuid()]));
  const workoutIds = new Map(plan.workouts.map(item => [item.id, uuid()]));
  return {
    ...state,
    catalog: plan.catalog.map(item => ({ ...item, id: exerciseIds.get(item.id)! })),
    workouts: plan.workouts.map(item => ({ ...item, id: workoutIds.get(item.id)!, exercises: item.exercises.map(exercise => ({ ...exercise, id: exerciseIds.get(exercise.id)! })) })),
    nextWorkoutId: plan.nextWorkoutId ? workoutIds.get(plan.nextWorkoutId)! : null,
    active: null, summaryId: null,
  };
}
