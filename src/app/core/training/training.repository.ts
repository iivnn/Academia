import { Injectable } from '@angular/core';
import { clearLocalData, openLocalDatabase, replaceLocalData } from '../storage/local-database';
import { emptyTrainingState, TrainingState } from './training.models';
import { withExerciseCatalog } from './exercise-catalog';
@Injectable({ providedIn: 'root' })
export class TrainingRepository {
  private database?: ReturnType<typeof openLocalDatabase>;
  private db() { return this.database ??= openLocalDatabase().catch(error => { this.database = undefined; throw error; }); }
  async load(): Promise<TrainingState> {
    const db = await this.db();
    const stored = await db.get('training', 'state');
    if (!stored) return emptyTrainingState();
    const state = withExerciseCatalog(stored);
    if (state !== stored) await db.put('training', state, 'state');
    return state;
  }
  async save(state: TrainingState) { await (await this.db()).put('training', state, 'state'); }
  async reset() { await clearLocalData(await this.db()); }
  async replaceAll(state: TrainingState) { await replaceLocalData(await this.db(), state); }
}
