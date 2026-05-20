/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useContext,
  useMemo,
  useSyncExternalStore,
} from 'react';

/**
 * Shared hover state for "global" readout mode.
 *
 * Why this provider exists:
 * - Charts can run in local mode (no provider) or global mode (with provider).
 * - In global mode, one chart publishes hover events and sibling charts consume them.
 *
 * Why this uses an external store:
 * - Updating React state/context on every mouse move can re-render entire chart trees.
 * - A tiny subscribe/getSnapshot store lets only hover subscribers update.
 * - Static chart marks (bars/lines/heatmap paths) are not forced to re-render.
 *
 * Why the exported contexts exist:
 * - `HoverStoreContext` exposes the store object.
 * - `HoverProviderContext` exposes provider presence as a simple boolean.
 *
 * Why `HoverProviderContext` still exists:
 * - It is a simple presence flag so consumers can detect whether a provider wraps
 *   them, independent of hover value.
 * - This avoids ambiguity between:
 *   1) "no provider present" and 2) "provider present, but current hover is null".
 */

function createNoopStore() {
  return {
    getSnapshot: () => null,
    setSnapshot: () => {},
    subscribe: () => () => {},
  };
}

export function createHoverStore() {
  let hoverPoint = null;
  const listeners = new Set();

  return {
    getSnapshot: () => hoverPoint,
    setSnapshot: (point) => {
      const nextPoint = point ?? null;
      if (Object.is(hoverPoint, nextPoint)) return;

      hoverPoint = nextPoint;
      listeners.forEach((listener) => listener());
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}

const defaultHoverStore = createNoopStore();

// Primary store context used by hover overlays and readouts.
export const HoverStoreContext = createContext(defaultHoverStore);
// Provider-presence flag so charts can safely fall back to local mode when unwrapped.
export const HoverProviderContext = createContext(false);

export function useHoverStoreSnapshot(hoverStore) {
  const storeFromContext = useContext(HoverStoreContext);
  const store = hoverStore || storeFromContext || defaultHoverStore;

  return useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getSnapshot,
  );
}

export function HoverPointProvider({ children }) {
  const hoverStore = useMemo(() => createHoverStore(), []);

  return (
    // This flag tells charts that global hover sync is available in this subtree.
    <HoverProviderContext.Provider value={true}>
      <HoverStoreContext.Provider value={hoverStore}>
        {children}
      </HoverStoreContext.Provider>
    </HoverProviderContext.Provider>
  );
}
