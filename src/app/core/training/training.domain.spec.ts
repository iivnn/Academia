import { describe, expect, it } from 'vitest';
import { compare, createSession, equivalent, finishSession, sessionComplete, summarize, validRecord } from './training.domain';
import { emptyTrainingState, Session, Workout } from './training.models';
const workout: Workout = { id: 'a', name: 'Meu treino', exercises: [{ id: 'supino', name: 'Supino', muscle: 'Peito', sets: 2, restSeconds: 60 }] };
function completed(id: string, time: number, weight: string, reps: string): Session {
  const session = createSession(workout, time, id);
  session.finishedAt = time + 100;
  session.exercises[0].records = [{ weight, reps, done: true }, { weight, reps, done: true }];
  return session;
}
describe('Registro e sequência', () => {
  it('não altera o treino cadastrado e começa com séries vazias', () => {
    const session = createSession(workout, 100, 's');
    expect(session.exercises[0].records).toHaveLength(2);
    session.exercises[0].name = 'Alterado';
    expect(workout.exercises[0].name).toBe('Supino');
    expect(sessionComplete(session)).toBe(false);
  });
  it('aceita zero kg e decimal com vírgula, mas rejeita séries inválidas', () => {
    expect(validRecord({ weight: '0', reps: '10', done: false })).toBe(true);
    expect(validRecord({ weight: '12,5', reps: '8', done: false })).toBe(true);
    for (const [weight, reps] of [['', '10'], ['-1', '10'], ['20', '2.5'], ['20', '0'], ['Infinity', '8'], ['0x10', '8'], ['20', '1e2']]) expect(validRecord({ weight, reps, done: false })).toBe(false);
  });
  it('bloqueia finalização parcial e só avança a sequência ao finalizar', () => {
    const state = { ...emptyTrainingState(), workouts: [workout, { ...workout, id: 'b' }], nextWorkoutId: 'a', active: createSession(workout, 100, 's') };
    expect(() => finishSession(state, 200)).toThrow();
    expect(state.nextWorkoutId).toBe('a');
    state.active = completed('s', 100, '20', '10');
    const finished = finishSession(state, 200);
    expect(finished.nextWorkoutId).toBe('b'); expect(finished.active).toBe(null); expect(finished.history).toHaveLength(1);
    const wrapped = finishSession({ ...finished, active: { ...completed('b-session', 300, '20', '10'), workoutId: 'b' } }, 400);
    expect(wrapped.nextWorkoutId).toBe('a');
  });
});
describe('Comparação', () => {
  it('não considera mais peso com menos repetições uma melhora clara', () => {
    expect(compare({ weight: 40, reps: 16 }, { weight: 35, reps: 20 })).toBe('Resultado misto');
    expect(compare({ weight: 40, reps: 20 }, { weight: 35, reps: 20 })).toBe('Melhor');
    expect(compare({ weight: 30, reps: 18 }, { weight: 35, reps: 20 })).toBe('Abaixo');
  });
  it('usa somente até 3 treinos equivalentes anteriores', () => {
    const current = completed('now', 500, '40', '10');
    const history = [completed('old', 100, '1', '10'), completed('1', 200, '25', '10'), completed('2', 300, '30', '10'), completed('3', 400, '35', '10'), current, { ...completed('other', 450, '100', '10'), workoutId: 'outro' }];
    const result = summarize(current, history);
    expect(result.count).toBe(3); expect(result.rows[0].average?.weight).toBe(30);
    expect(result.rows[0].last.weight).toBe(35); expect(result.versusLast).toBe('Melhor');
    expect(summarize(current, [current]).versusLast).toBe('Sem referência');
    const changed = structuredClone(current); changed.exercises[0].sets = 3;
    expect(equivalent(current, changed)).toBe(false);
  });
});
