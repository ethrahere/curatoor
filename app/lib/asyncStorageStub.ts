const createAsyncStorage = () => {
  const store = new Map<string, string>();

  return {
    async getItem(key: string) {
      return store.has(key) ? store.get(key)! : null;
    },
    async setItem(key: string, value: string) {
      store.set(key, value);
    },
    async removeItem(key: string) {
      store.delete(key);
    },
    async clear() {
      store.clear();
    },
    async getAllKeys() {
      return Array.from(store.keys());
    },
    async multiGet(keys: string[]) {
      return keys.map((key) => [key, store.get(key) ?? null] as [string, string | null]);
    },
    async multiSet(entries: Array<[string, string]>) {
      entries.forEach(([key, value]) => {
        store.set(key, value);
      });
    },
    async multiRemove(keys: string[]) {
      keys.forEach((key) => {
        store.delete(key);
      });
    },
  };
};

const asyncStorage = createAsyncStorage();

export default asyncStorage;
export const AsyncStorageStatic = asyncStorage;
export const useAsyncStorage = () => ({
  getItem: asyncStorage.getItem,
  setItem: asyncStorage.setItem,
  removeItem: asyncStorage.removeItem,
});
