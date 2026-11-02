import { DBSchema, openDB } from 'idb';
import type { TrainingState } from '../training/training.models';
interface AcademiaSchema extends DBSchema {
  settings: { key: string; value: { key: string; value: string } };
  training: { key: string; value: TrainingState };
}
// Incrementar a versão e adicionar migrações em upgrade ao evoluir o esquema.
export function openLocalDatabase(name = 'academia') {
  return openDB<AcademiaSchema>(name, 2, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('settings')) db.createObjectStore('settings', { keyPath: 'key' });
      if (!db.objectStoreNames.contains('training')) db.createObjectStore('training');
    },
    blocking(_current, _blocked, event) { (event.target as IDBDatabase).close(); }
  });
}

export async function clearLocalData(db: Awaited<ReturnType<typeof openLocalDatabase>>): Promise<void> {
  const stores = [...db.objectStoreNames];
  const transaction = db.transaction(stores, 'readwrite');
  await Promise.all(stores.map(name => transaction.objectStore(name).clear()));
  await transaction.done;
}
export async function replaceLocalData(db: Awaited<ReturnType<typeof openLocalDatabase>>, state: TrainingState): Promise<void> {
  const stores = [...db.objectStoreNames];
  const transaction = db.transaction(stores, 'readwrite');
  await Promise.all(stores.map(name => transaction.objectStore(name).clear()));
  await transaction.objectStore('training').put(state, 'state');
  await transaction.done;
}
