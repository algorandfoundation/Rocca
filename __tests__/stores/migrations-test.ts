// In-memory MMKV instances by id, so the test can assert the migrations
// ledger lives on the 'local' instance — deliberately separate from the
// keystore MMKV, which may be cleared without replaying migrations. The map
// is created inside the (hoisted) mock factory because `createMMKV` runs at
// module-eval time, before any test-file statement.
jest.mock('react-native-mmkv', () => {
  const instances = new Map<string, Map<string, string>>();
  (globalThis as any).mockMmkvInstances = instances;
  return {
    createMMKV: ({ id }: { id: string }) => {
      const data = instances.get(id) ?? new Map<string, string>();
      instances.set(id, data);
      return {
        getString: (k: string) => data.get(k),
        set: (k: string, v: string) => {
          data.set(k, v);
        },
        remove: (k: string) => {
          data.delete(k);
        },
        getAllKeys: () => [...data.keys()],
        getBoolean: () => undefined,
        clearAll: () => {
          data.clear();
        },
      };
    },
  };
});

import type { Revision } from '@algorandfoundation/provider-migrations';
import { migrationsLedger } from '@/stores/migrations';

const mockInstances = (globalThis as any).mockMmkvInstances as Map<string, Map<string, string>>;

const MODULE = '@algorandfoundation/react-native-keystore';
const revision: Revision = {
  id: 1,
  name: 'flag-legacy-passkeys',
  appliedAt: '2026-08-12T00:00:00.000Z',
};

describe('migrationsLedger', () => {
  beforeEach(() => {
    mockInstances.forEach((data) => data.clear());
  });

  it('reads as empty on a fresh install', async () => {
    await expect(migrationsLedger.read()).resolves.toEqual({});
  });

  it('round-trips applied revisions through the local MMKV', async () => {
    await migrationsLedger.write(MODULE, revision);
    await expect(migrationsLedger.read()).resolves.toEqual({ [MODULE]: revision });
    // Persisted on the general-purpose 'local' instance, not the keystore one.
    expect(mockInstances.get('local')?.size).toBe(1);
  });

  it('survives the keystore MMKV being cleared', async () => {
    await migrationsLedger.write(MODULE, revision);

    // Simulate clearing key material: the keystore MMKV is a separate
    // instance, so wiping it must not touch the ledger.
    const keystoreInstance = mockInstances.get('keystore') ?? new Map<string, string>();
    mockInstances.set('keystore', keystoreInstance);
    keystoreInstance.set('k/some-key', '{}');
    keystoreInstance.clear();

    await expect(migrationsLedger.read()).resolves.toEqual({ [MODULE]: revision });
  });

  it('treats a corrupt ledger as absent instead of throwing', async () => {
    mockInstances.get('local')?.set('@algorandfoundation/provider-migrations', 'not-json{');
    await expect(migrationsLedger.read()).resolves.toEqual({});
  });
});
