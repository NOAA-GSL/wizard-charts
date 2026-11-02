import {
  useCallback,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { ChartContext, ChartProvider } from './context/ChartProvider';
import {
  createHoverStore,
  HoverProviderContext,
  HoverStoreContext,
} from './context/HoverPointProvider';
import ErrorBoundary from './ErrorBoundary';
import { pointer } from 'd3';
import HoverReadoutLayer from './readout/HoverReadoutLayer';
import { getChartControllerInternal } from './hooks/useChartController';
import { defaultOptions } from './utilities/defaultOptions';
import { axisHasMappedSeries, mergeDeep } from './utilities/dataUtilities';
import {
  buildDomainFromCenterWindow,
  buildDomainFromPixelWindow,
  buildPannedDomain,
  buildZoomedDomain,
  clampToRange,
  domainsEqual,
  getZoomStateFromOverrides,
  isContinuousZoomAxisType,
  isPanPossible,
  normalizeZoomDomainOverrides,
  normalizeZoomOptions,
  toDomainNumber,
  zoomDomainOverridesEqual,
} from './utilities/zoomUtilities';
import XAxis from './axisComponents/XAxis';
import YAxis from './axisComponents/YAxis';
import Legend from './axisComponents/Legend';
import Line from './plotComponents/Line';
import Bar from './plotComponents/Bar';
import BoxPlot from './plotComponents/BoxPlot';
import Circle from './plotComponents/Circle';
import Area from './plotComponents/Area';
import AreaStacked from './plotComponents/AreaStacked';
import Matrix from './plotComponents/Matrix';
import Heatmap from './plotComponents/Heatmap';
import ContourGrid from './plotComponents/ContourGrid';
import WindBarbs from './plotComponents/WindBarbs';
import LineMarker from './plotComponents/LineMarker';

const SIZE_EPSILON = 0.25;
const AUTO_SIZE = 'auto';
const DEFAULT_AUTO_WIDTH = 800;
const DEFAULT_AUTO_HEIGHT = 600;
const CONTOUR_GRID_ALLOWED_MIX_TYPES = new Set([
  'contourGrid',
  'line',
  'area',
  'areaStacked',
  'circle',
  'windBarbs',
]);

function isAutoSizeValue(value) {
  return value == null || value === AUTO_SIZE;
}

function toNumericSize(value, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? Math.max(0, numeric) : fallback;
}

function parseCssPixelValue(value) {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
}

function isZoomModifierPressed(event, modifierKey) {
  switch (modifierKey) {
    case 'shift':
      return event.shiftKey;
    case 'alt':
      return event.altKey;
    case 'meta':
      return event.metaKey;
    case 'ctrl':
    default:
      return event.ctrlKey;
  }
}

function isKeyboardModifierPressed(event, modifierKey) {
  if (!event) return false;

  const modifierKeyNames = {
    ctrl: 'Control',
    shift: 'Shift',
    alt: 'Alt',
    meta: 'Meta',
  };
  const expectedKey = modifierKeyNames[modifierKey] || 'Control';

  // Keyup for the configured modifier should always clear interaction state.
  if (event.type === 'keyup' && event.key === expectedKey) {
    return false;
  }

  switch (modifierKey) {
    case 'shift':
      return event.shiftKey;
    case 'alt':
      return event.altKey;
    case 'meta':
      return event.metaKey;
    case 'ctrl':
    default:
      return event.ctrlKey;
  }
}

function measureSvgContentSize(svgNode, fallbackWidth, fallbackHeight) {
  const safeFallbackWidth = toNumericSize(fallbackWidth, 0);
  const safeFallbackHeight = toNumericSize(fallbackHeight, 0);

  if (
    !svgNode ||
    typeof window === 'undefined' ||
    typeof window.getComputedStyle !== 'function'
  ) {
    return {
      width: safeFallbackWidth,
      height: safeFallbackHeight,
    };
  }

  const styles = window.getComputedStyle(svgNode);
  const horizontalExtras =
    parseCssPixelValue(styles.paddingLeft) +
    parseCssPixelValue(styles.paddingRight) +
    parseCssPixelValue(styles.borderLeftWidth) +
    parseCssPixelValue(styles.borderRightWidth);
  const verticalExtras =
    parseCssPixelValue(styles.paddingTop) +
    parseCssPixelValue(styles.paddingBottom) +
    parseCssPixelValue(styles.borderTopWidth) +
    parseCssPixelValue(styles.borderBottomWidth);

  const rect = svgNode.getBoundingClientRect();
  const measuredWidth = rect.width - horizontalExtras;
  const measuredHeight = rect.height - verticalExtras;

  return {
    width: Number.isFinite(measuredWidth)
      ? Math.max(0, measuredWidth)
      : safeFallbackWidth,
    height: Number.isFinite(measuredHeight)
      ? Math.max(0, measuredHeight)
      : safeFallbackHeight,
  };
}

function PlotAreaClipGroup({ chartId, isZoomed, children }) {
  const { chartValues } = useContext(ChartContext);
  const margin = chartValues?.margin || {};
  const clipX = toNumericSize(margin.left, 0);
  const clipY = toNumericSize(margin.top, 0);
  const clipWidth = toNumericSize(chartValues?.innerWidth, 0);
  const clipHeight = toNumericSize(chartValues?.innerHeight, 0);
  const shouldClip =
    (chartValues.options.clipToChartArea || isZoomed) &&
    clipWidth > 0 &&
    clipHeight > 0;

  const clipPathId = useMemo(() => {
    const normalizedId = String(chartId || 'chart').replace(
      /[^a-zA-Z0-9_-]/g,
      '',
    );
    return `wizard-charts-plot-clip-${normalizedId || 'default'}`;
  }, [chartId]);

  return (
    <>
      {shouldClip && (
        <defs>
          <clipPath id={clipPathId} clipPathUnits="userSpaceOnUse">
            <rect x={clipX} y={clipY} width={clipWidth} height={clipHeight} />
          </clipPath>
        </defs>
      )}
      <g clipPath={shouldClip ? `url(#${clipPathId})` : undefined}>
        {children}
      </g>
    </>
  );
}

function ChartContainer({
  height,
  width,
  margin = { top: 'auto', right: 'auto', bottom: 'auto', left: 'auto' },
  data = [],
  options = {},
  controller,
  ReadoutComponent,
  children,
  className = '',
  sx = {},
}) {
  const hoverStoreFromProvider = useContext(HoverStoreContext);
  const hasHoverProvider = useContext(HoverProviderContext);
  const chartId = useId();
  const localHoverStore = useMemo(() => createHoverStore(), []);

  const svgReadoutRef = useRef(null);
  const plotBoundsRef = useRef(null);
  const xValueResolverRef = useRef(() => null);
  const pendingHoverEventRef = useRef(null);
  const hoverRafRef = useRef(null);
  const hasWarnedMissingProviderRef = useRef(false);
  const hasWarnedContourMixRef = useRef(false);
  const xScaleRef = useRef(null);
  const x2ScaleRef = useRef(null);
  const zoomBoundsRef = useRef({ x: null, x2: null });
  const xDomainOverridesRef = useRef({ x: null, x2: null });
  const panStateRef = useRef({
    isActive: false,
    lastX: 0,
  });
  const dragZoomStateRef = useRef({
    isActive: false,
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0,
    plotTop: 0,
    plotBottom: 0,
  });

  const isAutoWidth = isAutoSizeValue(width);
  const isAutoHeight = isAutoSizeValue(height);
  const requestedWidth = isAutoWidth
    ? DEFAULT_AUTO_WIDTH
    : toNumericSize(width, DEFAULT_AUTO_WIDTH);
  const requestedHeight = isAutoHeight
    ? DEFAULT_AUTO_HEIGHT
    : toNumericSize(height, DEFAULT_AUTO_HEIGHT);
  const svgWidth = isAutoWidth ? '100%' : requestedWidth;
  const svgHeight = isAutoHeight ? '100%' : requestedHeight;
  // Content-box size drives scales/margins, while width/height remain outer SVG size.
  const [measuredContentSize, setMeasuredContentSize] = useState(null);
  const [xDomainOverrides, setXDomainOverrides] = useState({
    x: null,
    x2: null,
  });
  const [panState, setPanState] = useState({
    isActive: false,
    lastX: 0,
  });
  const [dragZoomState, setDragZoomState] = useState({
    isActive: false,
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0,
    plotTop: 0,
    plotBottom: 0,
  });
  const [isPointerOverChart, setIsPointerOverChart] = useState(false);
  const [isPointerOverPlot, setIsPointerOverPlot] = useState(false);
  const [isModifierPressed, setIsModifierPressed] = useState(false);
  const controllerInternal = getChartControllerInternal(controller);

  const updateContentSize = useCallback(
    (nextSize) => {
      const nextWidth = toNumericSize(nextSize?.width, requestedWidth);
      const nextHeight = toNumericSize(nextSize?.height, requestedHeight);

      setMeasuredContentSize((prevSize) => {
        const hasPrevSize = prevSize != null;
        const prevWidth = toNumericSize(prevSize?.width, 0);
        const prevHeight = toNumericSize(prevSize?.height, 0);
        const hasUsablePrevSize =
          hasPrevSize && prevWidth > SIZE_EPSILON && prevHeight > SIZE_EPSILON;
        const hasUsableNextSize =
          nextWidth > SIZE_EPSILON && nextHeight > SIZE_EPSILON;

        // Ignore transient zero/near-zero observer reads once a usable size exists.
        if (!hasUsableNextSize && hasUsablePrevSize) {
          return prevSize;
        }

        if (
          Math.abs(prevWidth - nextWidth) < SIZE_EPSILON &&
          Math.abs(prevHeight - nextHeight) < SIZE_EPSILON
        ) {
          return prevSize;
        }

        return {
          width: nextWidth,
          height: nextHeight,
        };
      });
    },
    [requestedHeight, requestedWidth],
  );

  const measuredWidth = toNumericSize(measuredContentSize?.width, 0);
  const measuredHeight = toNumericSize(measuredContentSize?.height, 0);
  const hasMeasuredContentSize =
    measuredContentSize != null &&
    measuredWidth > SIZE_EPSILON &&
    measuredHeight > SIZE_EPSILON;

  const contentSize = useMemo(
    () => ({
      width: toNumericSize(measuredContentSize?.width, requestedWidth),
      height: toNumericSize(measuredContentSize?.height, requestedHeight),
    }),
    [
      measuredContentSize?.height,
      measuredContentSize?.width,
      requestedHeight,
      requestedWidth,
    ],
  );

  // Measure before paint so animated layers mount with final geometry.
  // Include hasMeasuredContentSize so we rebind observers after shell->provider
  // transition replaces the SVG node.
  useLayoutEffect(() => {
    const svgNode = svgReadoutRef.current;
    if (!svgNode) return;
    const parentNode = svgNode.parentElement;
    const shouldObserveParent =
      (isAutoWidth || isAutoHeight) && parentNode != null;

    const syncContentSize = () => {
      updateContentSize(
        measureSvgContentSize(svgNode, requestedWidth, requestedHeight),
      );
    };

    syncContentSize();

    if (
      typeof window === 'undefined' ||
      typeof window.ResizeObserver !== 'function'
    ) {
      return;
    }

    const observer = new window.ResizeObserver(() => {
      syncContentSize();
    });

    observer.observe(svgNode);

    // Parent observation catches layout-driven size changes in auto mode.
    if (shouldObserveParent) {
      observer.observe(parentNode);
    }

    return () => {
      observer.disconnect();
    };
  }, [
    hasMeasuredContentSize,
    isAutoHeight,
    isAutoWidth,
    requestedHeight,
    requestedWidth,
    updateContentSize,
  ]);

  const mergedOptions = useMemo(
    () => mergeDeep(defaultOptions, options),
    [options],
  );

  const zoomOptions = useMemo(
    () => normalizeZoomOptions(mergedOptions.zoom),
    [mergedOptions.zoom],
  );

  const zoomableAxes = useMemo(() => {
    const axes = mergedOptions.axes || {};
    const series = mergedOptions.series || [];

    return {
      x:
        axisHasMappedSeries(series, 'x') &&
        isContinuousZoomAxisType(axes.x?.type || 'linear'),
      x2:
        axisHasMappedSeries(series, 'x2') &&
        isContinuousZoomAxisType(axes.x2?.type || 'linear'),
    };
  }, [mergedOptions.axes, mergedOptions.series]);

  const isWheelZoomActive =
    zoomOptions.enabled &&
    zoomOptions.wheelEnabled &&
    (zoomableAxes.x || zoomableAxes.x2);

  const isDragZoomActive =
    zoomOptions.enabled &&
    zoomOptions.dragEnabled &&
    (zoomableAxes.x || zoomableAxes.x2);

  const isPanZoomActive =
    zoomOptions.enabled &&
    zoomOptions.panEnabled &&
    (zoomableAxes.x || zoomableAxes.x2);

  const isRightClickResetActive =
    zoomOptions.enabled &&
    zoomOptions.rightClickResetEnabled &&
    (zoomableAxes.x || zoomableAxes.x2);

  const isZoomDomainOverrideActive =
    isWheelZoomActive || isDragZoomActive || isPanZoomActive;

  const publishZoomState = useCallback(
    (overrides, source) => {
      controllerInternal?.setZoomState(
        getZoomStateFromOverrides(overrides, zoomBoundsRef.current, source),
        { source },
      );
    },
    [controllerInternal],
  );

  const applyZoomOverrides = useCallback(
    (nextOverrides, source) => {
      const normalizedOverrides = normalizeZoomDomainOverrides(nextOverrides);
      // Returning to the starting extent restores the unzoomed rendering policy.
      for (const axisKey of ['x', 'x2']) {
        if (
          domainsEqual(
            normalizedOverrides[axisKey],
            zoomBoundsRef.current[axisKey],
          )
        ) {
          normalizedOverrides[axisKey] = null;
        }
      }
      const previousOverrides = xDomainOverridesRef.current;

      if (zoomDomainOverridesEqual(previousOverrides, normalizedOverrides)) {
        return false;
      }

      xDomainOverridesRef.current = normalizedOverrides;
      setXDomainOverrides(normalizedOverrides);
      publishZoomState(normalizedOverrides, source);
      return true;
    },
    [publishZoomState],
  );

  const appliedDomainOverrides = useMemo(
    () =>
      isZoomDomainOverrideActive ? xDomainOverrides : { x: null, x2: null },
    [isZoomDomainOverrideActive, xDomainOverrides],
  );

  useEffect(() => {
    dragZoomStateRef.current = dragZoomState;
  }, [dragZoomState]);

  useEffect(() => {
    panStateRef.current = panState;
  }, [panState]);

  useEffect(() => {
    xDomainOverridesRef.current = xDomainOverrides;
  }, [xDomainOverrides]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const onModifierEvent = (event) => {
      const nextIsPressed = isKeyboardModifierPressed(
        event,
        zoomOptions.modifierKey,
      );
      setIsModifierPressed(nextIsPressed);

      if (!nextIsPressed) {
        setPanState((prev) => {
          if (!prev.isActive) return prev;
          return { ...prev, isActive: false };
        });
      }
    };

    window.addEventListener('keydown', onModifierEvent, true);
    window.addEventListener('keyup', onModifierEvent, true);

    return () => {
      window.removeEventListener('keydown', onModifierEvent, true);
      window.removeEventListener('keyup', onModifierEvent, true);
    };
  }, [zoomOptions.modifierKey]);

  // useMemo to avoid unnecessary re-renders in the useEffect hook of ChartProvider
  const initialValues = useMemo(
    () => ({
      height: contentSize.height,
      width: contentSize.width,
      baseMargin: margin,
      data,
      options: mergedOptions,
      domainOverrides: appliedDomainOverrides,
    }),
    [
      contentSize.height,
      contentSize.width,
      margin,
      data,
      mergedOptions,
      appliedDomainOverrides,
    ],
  );

  const configuredHoverMode = mergedOptions?.readout?.hoverMode;
  const shouldUseGlobalHover =
    configuredHoverMode === 'global' && hasHoverProvider;
  // Global mode is opt-in and only active when the provider is present.
  const effectiveHoverMode = shouldUseGlobalHover ? 'global' : 'local';
  const activeHoverStore = shouldUseGlobalHover
    ? hoverStoreFromProvider
    : localHoverStore;

  useEffect(() => {
    if (configuredHoverMode !== 'global') return;
    if (hasHoverProvider) return;
    if (hasWarnedMissingProviderRef.current) return;

    hasWarnedMissingProviderRef.current = true;

    if (typeof console === 'undefined' || typeof console.debug !== 'function') {
      return;
    }

    console.debug(
      '[wizard-charts] readout.hoverMode="global" requires HoverPointProvider. Falling back to local mode.',
    );
  }, [configuredHoverMode, hasHoverProvider]);

  useEffect(() => {
    const series = initialValues.options?.series || [];
    const hasContourGrid = series.some(
      (entry) => entry?.type === 'contourGrid',
    );
    if (!hasContourGrid) return;

    const hasUnsupportedMix = series.some(
      (entry) =>
        entry?.type != null && !CONTOUR_GRID_ALLOWED_MIX_TYPES.has(entry.type),
    );
    if (!hasUnsupportedMix) return;
    if (hasWarnedContourMixRef.current) return;

    hasWarnedContourMixRef.current = true;

    if (typeof console === 'undefined' || typeof console.debug !== 'function') {
      return;
    }

    console.debug(
      '[wizard-charts] contourGrid is currently validated for mixing with line/area/circle only. Other combinations may produce unexpected results.',
    );
  }, [initialValues.options?.series]);

  useEffect(
    () => () => {
      if (
        hoverRafRef.current != null &&
        typeof window !== 'undefined' &&
        typeof window.cancelAnimationFrame === 'function'
      ) {
        window.cancelAnimationFrame(hoverRafRef.current);
      }

      activeHoverStore.setSnapshot(null);
    },
    [activeHoverStore],
  );

  const queueHoverSnapshot = (nextSnapshot) => {
    pendingHoverEventRef.current = nextSnapshot;

    if (hoverRafRef.current != null) {
      return;
    }

    if (
      typeof window === 'undefined' ||
      typeof window.requestAnimationFrame !== 'function'
    ) {
      activeHoverStore.setSnapshot(nextSnapshot);
      pendingHoverEventRef.current = null;
      return;
    }

    // Keep hover publication to once per frame so dense charts stay smooth.
    hoverRafRef.current = window.requestAnimationFrame(() => {
      hoverRafRef.current = null;
      activeHoverStore.setSnapshot(pendingHoverEventRef.current);
      pendingHoverEventRef.current = null;
    });
  };

  const finalizePan = useCallback(() => {
    if (!panStateRef.current?.isActive) return;

    setPanState((prev) => {
      if (!prev.isActive) return prev;
      return { ...prev, isActive: false };
    });
  }, []);

  const getZoomBounds = useCallback((axisKey, scale) => {
    if (zoomBoundsRef.current[axisKey] == null) {
      const domain = scale?.domain?.();
      if (Array.isArray(domain) && domain.length === 2) {
        zoomBoundsRef.current[axisKey] = [domain[0], domain[1]];
      }
    }

    return zoomBoundsRef.current[axisKey];
  }, []);

  const setZoomWindow = useCallback(
    ({ center, windowSize } = {}) => {
      if (!zoomOptions.enabled) return false;

      const nextOverrides = { x: null, x2: null };

      if (zoomableAxes.x) {
        nextOverrides.x = buildDomainFromCenterWindow(
          xScaleRef.current,
          center,
          windowSize,
          zoomOptions.minWindow,
          getZoomBounds('x', xScaleRef.current),
        );
      }

      if (zoomableAxes.x2) {
        nextOverrides.x2 = buildDomainFromCenterWindow(
          x2ScaleRef.current,
          center,
          windowSize,
          zoomOptions.minWindow,
          getZoomBounds('x2', x2ScaleRef.current),
        );
      }

      if (nextOverrides.x == null && nextOverrides.x2 == null) return false;
      return applyZoomOverrides(nextOverrides, 'programmatic');
    },
    [
      applyZoomOverrides,
      getZoomBounds,
      zoomOptions.enabled,
      zoomOptions.minWindow,
      zoomableAxes.x,
      zoomableAxes.x2,
    ],
  );

  const setZoomCenter = useCallback(
    (center) => {
      const currentZoomState = getZoomStateFromOverrides(
        xDomainOverridesRef.current,
        zoomBoundsRef.current,
        null,
      );

      if (!Number.isFinite(currentZoomState.windowSize)) return false;
      return setZoomWindow({ center, windowSize: currentZoomState.windowSize });
    },
    [setZoomWindow],
  );

  const setZoomStart = useCallback(
    (start) => {
      const currentZoomState = getZoomStateFromOverrides(
        xDomainOverridesRef.current,
        zoomBoundsRef.current,
        null,
      );
      const startValue = toDomainNumber(start);

      if (!Number.isFinite(currentZoomState.windowSize)) return false;
      if (!Number.isFinite(startValue)) return false;

      return setZoomWindow({
        center: startValue + currentZoomState.windowSize / 2,
        windowSize: currentZoomState.windowSize,
      });
    },
    [setZoomWindow],
  );

  const setZoomEnd = useCallback(
    (end) => {
      const currentZoomState = getZoomStateFromOverrides(
        xDomainOverridesRef.current,
        zoomBoundsRef.current,
        null,
      );
      const endValue = toDomainNumber(end);

      if (!Number.isFinite(currentZoomState.windowSize)) return false;
      if (!Number.isFinite(endValue)) return false;

      return setZoomWindow({
        center: endValue - currentZoomState.windowSize / 2,
        windowSize: currentZoomState.windowSize,
      });
    },
    [setZoomWindow],
  );

  const resetZoom = useCallback(() => {
    finalizePan();

    if (dragZoomStateRef.current?.isActive) {
      setDragZoomState((prev) => {
        if (!prev.isActive) return prev;
        return { ...prev, isActive: false };
      });
    }

    return applyZoomOverrides({ x: null, x2: null }, 'reset');
  }, [applyZoomOverrides, finalizePan]);

  useEffect(() => {
    if (!controllerInternal) return;

    controllerInternal.bindApi({
      resetZoom,
      setZoomWindow,
      setZoomCenter,
      setZoomStart,
      setZoomEnd,
    });

    controllerInternal.setZoomState(
      getZoomStateFromOverrides(
        xDomainOverridesRef.current,
        zoomBoundsRef.current,
        null,
      ),
      { source: null },
    );

    return () => {
      controllerInternal.bindApi(null);
    };
  }, [
    controllerInternal,
    resetZoom,
    setZoomCenter,
    setZoomEnd,
    setZoomStart,
    setZoomWindow,
  ]);

  const finalizeDragZoom = useCallback(
    (event) => {
      const dragState = dragZoomStateRef.current;
      if (!dragState?.isActive) return;

      const svgNode = svgReadoutRef.current;
      const plotBounds = plotBoundsRef.current;

      if (!svgNode || !plotBounds || !isDragZoomActive) {
        setDragZoomState((prev) => ({
          ...prev,
          isActive: false,
        }));
        return;
      }

      const [releaseX, releaseY] = pointer(event, svgNode);
      const endX = Number.isFinite(releaseX) ? releaseX : dragState.currentX;
      const endY = Number.isFinite(releaseY) ? releaseY : dragState.currentY;

      const startX = clampToRange(
        dragState.startX,
        plotBounds.left,
        plotBounds.right,
      );
      const clampedEndX = clampToRange(endX, plotBounds.left, plotBounds.right);

      const selectedWidth = Math.abs(clampedEndX - startX);

      setDragZoomState((prev) => ({
        ...prev,
        isActive: false,
        currentX: clampedEndX,
        currentY: clampToRange(endY, plotBounds.top, plotBounds.bottom),
      }));

      if (selectedWidth < zoomOptions.minDragPixels) {
        return;
      }

      const nextOverrides = { x: null, x2: null };

      if (zoomableAxes.x) {
        nextOverrides.x = buildDomainFromPixelWindow(
          xScaleRef.current,
          startX,
          clampedEndX,
          zoomOptions.minWindow,
          getZoomBounds('x', xScaleRef.current),
        );
      }

      if (zoomableAxes.x2) {
        nextOverrides.x2 = buildDomainFromPixelWindow(
          x2ScaleRef.current,
          startX,
          clampedEndX,
          zoomOptions.minWindow,
          getZoomBounds('x2', x2ScaleRef.current),
        );
      }

      if (nextOverrides.x == null && nextOverrides.x2 == null) {
        return;
      }

      applyZoomOverrides(nextOverrides, 'drag');
    },
    [
      applyZoomOverrides,
      getZoomBounds,
      isDragZoomActive,
      zoomOptions.minDragPixels,
      zoomOptions.minWindow,
      zoomableAxes.x,
      zoomableAxes.x2,
    ],
  );

  const handleMouseDown = useCallback(
    (event) => {
      const modifierPressed = isZoomModifierPressed(
        event,
        zoomOptions.modifierKey,
      );

      if (event.button !== 0 && event.button !== 2) return;

      const svgNode = svgReadoutRef.current;
      const plotBounds = plotBoundsRef.current;
      if (!svgNode || !plotBounds) return;

      const [localX, localY] = pointer(event, svgNode);
      const isInsidePlot =
        localX >= plotBounds.left &&
        localX <= plotBounds.right &&
        localY >= plotBounds.top &&
        localY <= plotBounds.bottom;

      if (!isInsidePlot) return;

      if (event.button === 2) {
        if (!isRightClickResetActive) return;

        event.preventDefault();
        event.stopPropagation();
        resetZoom();
        return;
      }

      if (modifierPressed) {
        if (!isPanZoomActive) return;

        const hasPannableXAxis =
          zoomableAxes.x &&
          isPanPossible(xScaleRef.current, zoomBoundsRef.current.x);
        const hasPannableX2Axis =
          zoomableAxes.x2 &&
          isPanPossible(x2ScaleRef.current, zoomBoundsRef.current.x2);

        if (!hasPannableXAxis && !hasPannableX2Axis) {
          return;
        }

        event.preventDefault();
        event.stopPropagation();

        setPanState({
          isActive: true,
          lastX: localX,
        });
        return;
      }

      if (event.button !== 0) return;

      if (!isDragZoomActive) return;

      event.preventDefault();
      event.stopPropagation();

      setDragZoomState({
        isActive: true,
        startX: localX,
        startY: localY,
        currentX: localX,
        currentY: localY,
        plotTop: plotBounds.top,
        plotBottom: plotBounds.bottom,
      });
    },
    [
      isDragZoomActive,
      isPanZoomActive,
      isRightClickResetActive,
      resetZoom,
      zoomOptions.modifierKey,
      zoomableAxes.x,
      zoomableAxes.x2,
    ],
  );

  const handleContextMenu = useCallback(
    (event) => {
      if (!zoomOptions.enabled) return;

      const svgNode = svgReadoutRef.current;
      if (!svgNode) return;

      const plotBounds = plotBoundsRef.current;
      if (plotBounds) {
        const [localX, localY] = pointer(event, svgNode);
        const isInsidePlot =
          localX >= plotBounds.left &&
          localX <= plotBounds.right &&
          localY >= plotBounds.top &&
          localY <= plotBounds.bottom;

        if (isInsidePlot && isRightClickResetActive) {
          event.preventDefault();
          event.stopPropagation();
          return;
        }
      }

      if (!isPanZoomActive) return;

      const rect = svgNode.getBoundingClientRect();
      const isInsideChart =
        event.clientX >= rect.left &&
        event.clientX <= rect.right &&
        event.clientY >= rect.top &&
        event.clientY <= rect.bottom;
      if (!isInsideChart) return;

      const modifierPressed = isZoomModifierPressed(
        event,
        zoomOptions.modifierKey,
      );

      if (!modifierPressed && !panStateRef.current?.isActive) return;

      event.preventDefault();
      event.stopPropagation();
    },
    [
      isPanZoomActive,
      isRightClickResetActive,
      zoomOptions.enabled,
      zoomOptions.modifierKey,
    ],
  );

  useEffect(() => {
    if (!dragZoomState.isActive) return;
    if (typeof window === 'undefined') return;

    const handleWindowMouseUp = (event) => {
      finalizeDragZoom(event);
    };

    window.addEventListener('mouseup', handleWindowMouseUp, true);

    return () => {
      window.removeEventListener('mouseup', handleWindowMouseUp, true);
    };
  }, [dragZoomState.isActive, finalizeDragZoom]);

  useEffect(() => {
    if (!panState.isActive) return;
    if (typeof window === 'undefined') return;

    const handleWindowMouseUp = () => {
      finalizePan();
    };

    window.addEventListener('mouseup', handleWindowMouseUp, true);

    return () => {
      window.removeEventListener('mouseup', handleWindowMouseUp, true);
    };
  }, [panState.isActive, finalizePan]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleBlur = () => {
      finalizePan();
    };

    window.addEventListener('blur', handleBlur, true);

    return () => {
      window.removeEventListener('blur', handleBlur, true);
    };
  }, [finalizePan]);

  const handleWheel = useCallback(
    (event) => {
      if (!zoomOptions.enabled || !zoomOptions.wheelEnabled) return;
      if (!isZoomModifierPressed(event, zoomOptions.modifierKey)) return;

      const svgNode = svgReadoutRef.current;
      if (!svgNode) return;

      const rect = svgNode.getBoundingClientRect();
      const isInsideChart =
        event.clientX >= rect.left &&
        event.clientX <= rect.right &&
        event.clientY >= rect.top &&
        event.clientY <= rect.bottom;

      if (!isInsideChart) return;

      // When modifier-wheel zoom is active over the chart, suppress page/browser wheel behavior.
      event.preventDefault();
      event.stopPropagation();

      if (!isWheelZoomActive) return;

      const plotBounds = plotBoundsRef.current;
      if (!plotBounds) return;

      const [localX, localY] = pointer(event, svgNode);
      const isInsidePlot =
        localX >= plotBounds.left &&
        localX <= plotBounds.right &&
        localY >= plotBounds.top &&
        localY <= plotBounds.bottom;

      if (!isInsidePlot) return;

      const deltaY = Number(event.deltaY);
      if (!Number.isFinite(deltaY) || deltaY === 0) return;

      const zoomFactor = Math.exp(
        (deltaY > 0 ? 1 : -1) * zoomOptions.wheelZoomSpeed,
      );

      const nextOverrides = { x: null, x2: null };

      if (zoomableAxes.x) {
        nextOverrides.x = buildZoomedDomain(
          xScaleRef.current,
          localX,
          zoomFactor,
          zoomOptions.minWindow,
          getZoomBounds('x', xScaleRef.current),
        );
      }

      if (zoomableAxes.x2) {
        nextOverrides.x2 = buildZoomedDomain(
          x2ScaleRef.current,
          localX,
          zoomFactor,
          zoomOptions.minWindow,
          getZoomBounds('x2', x2ScaleRef.current),
        );
      }

      if (nextOverrides.x == null && nextOverrides.x2 == null) return;
      applyZoomOverrides(nextOverrides, 'wheel');
    },
    [
      applyZoomOverrides,
      getZoomBounds,
      isWheelZoomActive,
      zoomOptions.enabled,
      zoomOptions.minWindow,
      zoomOptions.modifierKey,
      zoomOptions.wheelEnabled,
      zoomOptions.wheelZoomSpeed,
      zoomableAxes.x,
      zoomableAxes.x2,
    ],
  );

  useLayoutEffect(() => {
    if (typeof window === 'undefined') return;

    window.addEventListener('wheel', handleWheel, {
      passive: false,
      capture: true,
    });

    return () => {
      window.removeEventListener('wheel', handleWheel, true);
    };
  }, [handleWheel, hasMeasuredContentSize]);

  useLayoutEffect(() => {
    if (typeof window === 'undefined') return;

    window.addEventListener('contextmenu', handleContextMenu, true);

    return () => {
      window.removeEventListener('contextmenu', handleContextMenu, true);
    };
  }, [handleContextMenu]);

  const handleMouseMove = (event) => {
    const svgNode = svgReadoutRef.current;
    if (!svgNode) return;

    setIsModifierPressed(isZoomModifierPressed(event, zoomOptions.modifierKey));

    if (panState.isActive) {
      const [panX, panY] = pointer(event, svgNode);
      if (!Number.isFinite(panX)) return;

      const plotBounds = plotBoundsRef.current;
      if (!plotBounds) return;

      const isInsidePlot =
        panX >= plotBounds.left &&
        panX <= plotBounds.right &&
        panY >= plotBounds.top &&
        panY <= plotBounds.bottom;
      setIsPointerOverPlot(isInsidePlot);

      const clampedPanX = clampToRange(panX, plotBounds.left, plotBounds.right);
      const deltaX = clampedPanX - panState.lastX;

      setPanState((prev) => {
        if (!prev.isActive) return prev;
        return {
          ...prev,
          lastX: clampedPanX,
        };
      });

      if (deltaX === 0) {
        queueHoverSnapshot(null);
        return;
      }

      const nextOverrides = { x: null, x2: null };

      if (zoomableAxes.x && zoomBoundsRef.current.x != null) {
        nextOverrides.x = buildPannedDomain(
          xScaleRef.current,
          deltaX,
          zoomBoundsRef.current.x,
        );
      }

      if (zoomableAxes.x2 && zoomBoundsRef.current.x2 != null) {
        nextOverrides.x2 = buildPannedDomain(
          x2ScaleRef.current,
          deltaX,
          zoomBoundsRef.current.x2,
        );
      }

      if (nextOverrides.x == null && nextOverrides.x2 == null) {
        queueHoverSnapshot(null);
        return;
      }

      applyZoomOverrides(nextOverrides, 'pan');

      queueHoverSnapshot(null);
      return;
    }

    if (dragZoomState.isActive) {
      const [dragX, dragY] = pointer(event, svgNode);
      const plotBounds = plotBoundsRef.current;

      if (!plotBounds) return;

      const isInsidePlot =
        dragX >= plotBounds.left &&
        dragX <= plotBounds.right &&
        dragY >= plotBounds.top &&
        dragY <= plotBounds.bottom;
      setIsPointerOverPlot(isInsidePlot);

      setDragZoomState((prev) => {
        if (!prev.isActive) return prev;

        return {
          ...prev,
          currentX: clampToRange(dragX, plotBounds.left, plotBounds.right),
          currentY: clampToRange(dragY, plotBounds.top, plotBounds.bottom),
        };
      });

      queueHoverSnapshot(null);
      return;
    }

    const plotBounds = plotBoundsRef.current;
    if (!plotBounds || plotBounds.width <= 0 || plotBounds.height <= 0) {
      queueHoverSnapshot(null);
      return;
    }

    const [localX, localY] = pointer(event, svgNode);
    const rect = svgNode.getBoundingClientRect();
    const widthPx = Number(initialValues.width) || rect.width || requestedWidth;
    const heightPx =
      Number(initialValues.height) || rect.height || requestedHeight;

    const isInsidePlot =
      localX >= plotBounds.left &&
      localX <= plotBounds.right &&
      localY >= plotBounds.top &&
      localY <= plotBounds.bottom;
    setIsPointerOverPlot(isInsidePlot);

    if (!isInsidePlot) {
      queueHoverSnapshot(null);
      return;
    }

    const resolveXValue = xValueResolverRef.current;
    const xValue =
      typeof resolveXValue === 'function' ? resolveXValue(localX) : null;

    if (xValue == null) {
      queueHoverSnapshot(null);
      return;
    }

    const plotWidth = plotBounds.right - plotBounds.left;
    const plotHeight = plotBounds.bottom - plotBounds.top;

    // Publish x-domain value so global readouts can align by data space, not screen ratios.
    const hoverEvent = {
      sourceChartId: chartId,
      clientX: event.clientX,
      clientY: event.clientY,
      localX,
      localY,
      xValue,
      normalizedX: widthPx > 0 ? localX / widthPx : null,
      normalizedY: heightPx > 0 ? localY / heightPx : null,
      normalizedPlotX:
        plotWidth > 0 ? (localX - plotBounds.left) / plotWidth : null,
      normalizedPlotY:
        plotHeight > 0 ? (localY - plotBounds.top) / plotHeight : null,
      timestamp: Date.now(),
    };

    queueHoverSnapshot(hoverEvent);
  };

  // Clear hover state so overlays stop rendering stale readouts.
  const handleMouseEnter = () => {
    setIsPointerOverChart(true);
  };

  const handleMouseLeave = () => {
    setIsPointerOverChart(false);
    setIsPointerOverPlot(false);
    setIsModifierPressed(false);
    pendingHoverEventRef.current = null;

    finalizePan();

    if (dragZoomStateRef.current?.isActive) {
      setDragZoomState((prev) => ({
        ...prev,
        isActive: false,
      }));
    }

    if (
      hoverRafRef.current != null &&
      typeof window !== 'undefined' &&
      typeof window.cancelAnimationFrame === 'function'
    ) {
      window.cancelAnimationFrame(hoverRafRef.current);
      hoverRafRef.current = null;
    }

    activeHoverStore.setSnapshot(null);
  };

  // switch statement to render different series types based on options
  const seriesNodes = mergedOptions.series.map((s, i) => {
    switch (s.type) {
      case 'area':
        return <Area key={s.id ?? i} seriesIndex={i} options={s} />;
      case 'areaStacked':
        return <AreaStacked key={s.id ?? i} seriesIndex={i} options={s} />;
      case 'bar':
        return <Bar key={s.id ?? i} seriesIndex={i} options={s} />;
      case 'boxPlot':
        return <BoxPlot key={s.id ?? i} seriesIndex={i} options={s} />;
      case 'circle':
        return <Circle key={s.id ?? i} seriesIndex={i} options={s} />;
      case 'line':
        return <Line key={s.id ?? i} seriesIndex={i} options={s} />;
      case 'matrix':
        return <Matrix key={s.id ?? i} seriesIndex={i} options={s} />;
      case 'heatmap':
        return <Heatmap key={s.id ?? i} seriesIndex={i} options={s} />;
      case 'contourGrid':
        return <ContourGrid key={s.id ?? i} seriesIndex={i} options={s} />;
      case 'windBarbs':
        return <WindBarbs key={s.id ?? i} seriesIndex={i} options={s} />;
      default:
        return null;
    }
  });

  const axes = mergedOptions.axes || {};
  const series = mergedOptions.series || [];
  const hasAxisLineMarkers = (axisOptions) =>
    Array.isArray(axisOptions?.lineMarkers) &&
    axisOptions.lineMarkers.length > 0;

  const dragSelectionRect = useMemo(() => {
    if (!dragZoomState.isActive || panState.isActive) return null;

    const x1 = Math.min(dragZoomState.startX, dragZoomState.currentX);
    const x2 = Math.max(dragZoomState.startX, dragZoomState.currentX);
    const y1 = Math.min(dragZoomState.plotTop, dragZoomState.plotBottom);
    const y2 = Math.max(dragZoomState.plotTop, dragZoomState.plotBottom);

    const rectWidth = Math.max(0, x2 - x1);
    const rectHeight = Math.max(0, y2 - y1);
    if (rectWidth <= 0 || rectHeight <= 0) return null;

    return {
      x: x1,
      y: y1,
      width: rectWidth,
      height: rectHeight,
    };
  }, [
    dragZoomState.currentX,
    dragZoomState.isActive,
    dragZoomState.plotBottom,
    dragZoomState.plotTop,
    dragZoomState.startX,
    panState.isActive,
  ]);

  const shouldShowPanCursor =
    zoomOptions.enabled &&
    (zoomableAxes.x || zoomableAxes.x2) &&
    isPointerOverChart &&
    isPointerOverPlot &&
    isModifierPressed;

  // Phase 1: render only an SVG shell so we can measure content-box size first.
  const svgNode = (
    <svg
      ref={svgReadoutRef}
      height={svgHeight}
      width={svgWidth}
      className={className}
      style={{
        fontFamily: 'inherit',
        ...sx,
        ...(shouldShowPanCursor ? { cursor: zoomOptions.panCursor } : {}),
      }}
      onMouseEnter={handleMouseEnter}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {hasMeasuredContentSize && (
        <>
          {axes.x && axisHasMappedSeries(series, 'x') && (
            <XAxis options={axes.x} axisKey="x" />
          )}
          {axes.x2 && axisHasMappedSeries(series, 'x2') && (
            <XAxis options={axes.x2} axisKey="x2" />
          )}
          {axes.y && axisHasMappedSeries(series, 'y') && (
            <YAxis options={axes.y} axisKey="y" />
          )}
          {axes.y2 && axisHasMappedSeries(series, 'y2') && (
            <YAxis options={axes.y2} axisKey="y2" />
          )}
          <PlotAreaClipGroup
            chartId={chartId}
            isZoomed={Boolean(
              appliedDomainOverrides.x || appliedDomainOverrides.x2,
            )}
          >
            {seriesNodes}
            {axes.x && hasAxisLineMarkers(axes.x) && (
              <LineMarker options={axes.x} axisKey="x" />
            )}
            {axes.x2 && hasAxisLineMarkers(axes.x2) && (
              <LineMarker options={axes.x2} axisKey="x2" />
            )}
            {axes.y && hasAxisLineMarkers(axes.y) && (
              <LineMarker options={axes.y} axisKey="y" />
            )}
            {axes.y2 && hasAxisLineMarkers(axes.y2) && (
              <LineMarker options={axes.y2} axisKey="y2" />
            )}
            {dragSelectionRect && (
              <rect
                x={dragSelectionRect.x}
                y={dragSelectionRect.y}
                width={dragSelectionRect.width}
                height={dragSelectionRect.height}
                fill={zoomOptions.dragBox.fill}
                stroke={zoomOptions.dragBox.stroke}
                strokeWidth={zoomOptions.dragBox.strokeWidth}
                pointerEvents="none"
              />
            )}
          </PlotAreaClipGroup>
          <Legend />
          {children}
          <HoverReadoutLayer
            chartId={chartId}
            hoverStore={activeHoverStore}
            mode={effectiveHoverMode}
            readoutOptions={mergedOptions?.readout}
            plotBoundsRef={plotBoundsRef}
            xValueResolverRef={xValueResolverRef}
            xScaleRef={xScaleRef}
            x2ScaleRef={x2ScaleRef}
            svgRef={svgReadoutRef}
            controller={controller}
            ReadoutComponent={ReadoutComponent}
          />
        </>
      )}
    </svg>
  );

  // Phase 2: once measured, mount provider + animated chart internals.
  if (!hasMeasuredContentSize) {
    return <ErrorBoundary>{svgNode}</ErrorBoundary>;
  }

  return (
    <ChartProvider initialValues={initialValues}>
      <ErrorBoundary>{svgNode}</ErrorBoundary>
    </ChartProvider>
  );
}

export default ChartContainer;
