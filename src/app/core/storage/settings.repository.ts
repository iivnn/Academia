import { Injectable } from '@angular/core';
import { openLocalDatabase } from './local-database';
@Injectable({ providedIn: 'root' })
export class SettingsRepository {
  private database?: ReturnType<typeof openLocalDatabase>;
  private db() { return this.database ??= openLocalDatabase().catch(error => { this.database = undefined; throw error; }); }
  async get(key: string): Promise<string | undefined> { return (await (await this.db()).get('settings', key))?.value; }
  async set(key: string, value: string): Promise<void> { await (await this.db()).put('settings', { key, value }); }
}
