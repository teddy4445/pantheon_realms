/**
 * React bindings for the AppStore. Components re-render on store version changes;
 * game data is always read from the current session state (never copied).
 */
import { createContext, useContext, useSyncExternalStore, type ReactNode } from 'react';
import type { AppStore } from './store';

const StoreContext = createContext<AppStore | null>(null);

export function StoreProvider({ store, children }: { store: AppStore; children: ReactNode }) {
  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>;
}

export function useStore(): AppStore {
  const store = useContext(StoreContext);
  if (!store) throw new Error('StoreProvider missing');
  useSyncExternalStore(store.subscribe, store.getVersion, store.getVersion);
  return store;
}
