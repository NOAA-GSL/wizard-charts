/* eslint-disable react-refresh/only-export-components */
import { createContext, useState, useCallback } from 'react';

/**
 * Shared hover state for "global" readout mode.
 *
 * Why this provider exists:
 * - Charts can run in local mode (no provider) or global mode (with provider).
 * - In global mode, one chart publishes hover events and sibling charts consume them.
 *
 * Why there are multiple contexts:
 * - `HoverPointContext` stores the current hover payload (read-only value).
 * - `HoverUpdateContext` stores the setter function (write-only updater).
 * - Splitting read/write contexts helps avoid unnecessary re-renders in components
 *   that only publish updates and do not need to read the hover value.
 *
 * Why `HoverProviderContext` exists:
 * - It is a simple presence flag so consumers can detect whether a provider wraps
 *   them, independent of hover value.
 * - This avoids ambiguity between:
 *   1) "no provider present" and 2) "provider present, but current hover is null".
 */

// Default no-op updater allows charts to run in local mode when no provider is present.
const noop = () => {};

// Read-only hover value consumed by charts that need synchronized hover coordinates.
export const HoverPointContext = createContext(null);
// Write-only updater consumed by charts that publish hover changes.
export const HoverUpdateContext = createContext(noop);
// Provider-presence flag so charts can safely fall back to local mode when unwrapped.
export const HoverProviderContext = createContext(false);

export function HoverPointProvider({ children }) {
  const [hoverPoint, setHoverPoint] = useState(null);

  const updateHoverPoint = useCallback((point) => {
    setHoverPoint(point ?? null);
  }, []);

  return (
    // Explicit `value={true}` keeps the intent obvious:
    // this context is not carrying data, only signaling "provider is present".
    <HoverProviderContext.Provider value={true}>
      <HoverPointContext.Provider value={hoverPoint}>
        <HoverUpdateContext.Provider value={updateHoverPoint}>
          {children}
        </HoverUpdateContext.Provider>
      </HoverPointContext.Provider>
    </HoverProviderContext.Provider>
  );
}
