import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';

// Shared symbol used as the non-public bridge between the consumer-facing
// controller object and ChartContainer's internal zoom API binding.
const CONTROLLER_INTERNAL = Symbol.for('wizard-charts.controller.internal');

export const defaultZoomState = Object.freeze({
  domain: { x: null, x2: null },
  center: null,
  centerValue: null,
  windowSize: null,
  bounds: { x: null, x2: null },
  isZoomed: false,
  source: null,
});

const noopApi = {
  resetZoom: () => false,
  setZoomWindow: () => false,
  setZoomCenter: () => false,
};

function cloneDomain(domain) {
  return Array.isArray(domain) && domain.length === 2
    ? [domain[0], domain[1]]
    : null;
}

function createChartControllerStore() {
  const listeners = new Set();
  let api = noopApi;
  let onZoomStateChange = null;
  let zoomState = defaultZoomState;

  const notify = (nextZoomState, context = {}) => {
    const previousZoomState = zoomState;
    zoomState = {
      ...defaultZoomState,
      ...nextZoomState,
      domain: {
        x: cloneDomain(nextZoomState?.domain?.x),
        x2: cloneDomain(nextZoomState?.domain?.x2),
      },
      bounds: {
        x: cloneDomain(nextZoomState?.bounds?.x),
        x2: cloneDomain(nextZoomState?.bounds?.x2),
      },
    };

    if (typeof onZoomStateChange === 'function') {
      onZoomStateChange(zoomState, {
        ...context,
        previousZoomState,
      });
    }

    listeners.forEach((listener) => listener());
  };

  const controller = {
    resetZoom: () => api.resetZoom(),
    setZoomWindow: (params) => api.setZoomWindow(params),
    setZoomCenter: (center) => api.setZoomCenter(center),
    getZoomState: () => zoomState,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };

  Object.defineProperty(controller, 'zoomState', {
    get: () => zoomState,
  });

  Object.defineProperty(controller, CONTROLLER_INTERNAL, {
    value: {
      bindApi: (nextApi) => {
        api = nextApi || noopApi;
      },
      setOnZoomStateChange: (callback) => {
        onZoomStateChange = callback;
      },
      setZoomState: notify,
    },
  });

  return controller;
}

export function getChartControllerInternal(controller) {
  return controller?.[CONTROLLER_INTERNAL] || null;
}

export function useChartZoomState(controller) {
  return useSyncExternalStore(
    controller?.subscribe || (() => () => {}),
    () => controller?.getZoomState?.() || defaultZoomState,
    () => defaultZoomState,
  );
}

export function useChartController({ onZoomStateChange } = {}) {
  const [controller] = useState(() => createChartControllerStore());
  const zoomState = useChartZoomState(controller);

  useEffect(() => {
    const internal = getChartControllerInternal(controller);
    internal?.setOnZoomStateChange(onZoomStateChange);

    return () => {
      internal?.setOnZoomStateChange(null);
    };
  }, [controller, onZoomStateChange]);

  return useMemo(
    () => ({
      controller,
      zoomState,
    }),
    [controller, zoomState],
  );
}
