import 'fake-indexeddb/auto';
import { describe, it, expect } from 'vitest';
import { deleteDB } from 'idb';
import { openLocalDatabase } from './local-database';
describe('Banco local', () => {
  it('preserva dados após fechar e reabrir o banco', async () => {
    const name = 'academia-test-' + crypto.randomUUID();
    const first = await openLocalDatabase(name);
    await first.put('settings', { key: 'initializedAt', value: '2026-11-02' });
    first.close();
    const reopened = await openLocalDatabase(name);
    expect(await reopened.get('settings', 'initializedAt')).toEqual({ key: 'initializedAt', value: '2026-11-02' });
    reopened.close(); await deleteDB(name);
  });
});
