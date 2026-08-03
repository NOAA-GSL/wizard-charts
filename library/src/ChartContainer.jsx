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
import { defaultOptions } from './utilities/defaultOptions';
import { axisHasMappedSeries, mergeDeep } from './utilities/dataUtilities';
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
const DEFAULT_WHEEL_ZOOM_SPEED = 0.1;
const DEFAULT_ZOOM_MIN_WINDOW = 0;
const SUPPORTED_ZOOM_MODIFIER_KEYS = new Set([
  'ctrl',
  'shift',
  'alt',
  'meta',
  'none',
]);
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

function isContinuousZoomAxisType(type) {
  return type === 'linear' || type === 'time';
}

function normalizeZoomOptions(zoomOptions = {}) {
  const modifierRaw = String(zoomOptions?.modifierKey || 'ctrl').toLowerCase();
  const modifierKey = SUPPORTED_ZOOM_MODIFIER_KEYS.has(modifierRaw)
    ? modifierRaw
    : 'ctrl';

  const wheelZoomSpeed = Number(zoomOptions?.wheelZoomSpeed);
  const minWindow = Number(zoomOptions?.minWindow);

  return {
    enabled: zoomOptions?.enabled !== false,
    wheelEnabled: zoomOptions?.wheelEnabled !== false,
    modifierKey,
    wheelZoomSpeed:
      Number.isFinite(wheelZoomSpeed) && wheelZoomSpeed > 0
        ? wheelZoomSpeed
        : DEFAULT_WHEEL_ZOOM_SPEED,
    minWindow:
      Number.isFinite(minWindow) && minWindow > 0
        ? minWindow
        : DEFAULT_ZOOM_MIN_WINDOW,
  };
}

function isZoomModifierPressed(event, modifierKey) {
  switch (modifierKey) {
    case 'none':
      return true;
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

function toDomainNumber(value) {
  if (value instanceof Date) return value.getTime();
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function convertDomainValue(sampleValue, numericValue) {
  if (!Number.isFinite(numericValue)) return null;
  if (sampleValue instanceof Date) return new Date(numericValue);
  return numericValue;
}

function normalizeDomainBounds(bounds) {
  if (!Array.isArray(bounds) || bounds.length !== 2) return null;

  const start = toDomainNumber(bounds[0]);
  const end = toDomainNumber(bounds[1]);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
    return null;
  }

  return { start, end };
}

function buildZoomedDomain(
  scale,
  anchorPixel,
  zoomFactor,
  minWindow = 0,
  bounds = null,
) {
  if (!scale || typeof scale.invert !== 'function') return null;

  const domain = scale.domain?.();
  if (!Array.isArray(domain) || domain.length !== 2) return null;

  const domainStart = toDomainNumber(domain[0]);
  const domainEnd = toDomainNumber(domain[1]);
  if (!Number.isFinite(domainStart) || !Number.isFinite(domainEnd)) return null;

  const span = domainEnd - domainStart;
  if (!Number.isFinite(span) || span <= 0) return null;

  const anchorValue = scale.invert(anchorPixel);
  const anchorNumber = toDomainNumber(anchorValue);
  if (!Number.isFinite(anchorNumber)) return null;

  const anchorRatio = (anchorNumber - domainStart) / span;
  const normalizedAnchorRatio = Number.isFinite(anchorRatio)
    ? Math.min(1, Math.max(0, anchorRatio))
    : 0.5;

  const requestedSpan = span * zoomFactor;
  const normalizedBounds = normalizeDomainBounds(bounds);
  const boundsSpan = normalizedBounds
    ? normalizedBounds.end - normalizedBounds.start
    : null;
  const maxSpan = Number.isFinite(boundsSpan) ? boundsSpan : Infinity;
  const nextSpan = Math.min(maxSpan, Math.max(minWindow, requestedSpan));
  if (!Number.isFinite(nextSpan) || nextSpan <= 0) return null;

  let nextStart = anchorNumber - normalizedAnchorRatio * nextSpan;
  let nextEnd = nextStart + nextSpan;

  if (normalizedBounds) {
    if (nextStart < normalizedBounds.start) {
      const shift = normalizedBounds.start - nextStart;
      nextStart += shift;
      nextEnd += shift;
    }

    if (nextEnd > normalizedBounds.end) {
      const shift = nextEnd - normalizedBounds.end;
      nextStart -= shift;
      nextEnd -= shift;
    }

    nextStart = Math.max(normalizedBounds.start, nextStart);
    nextEnd = Math.min(normalizedBounds.end, nextEnd);
  }

  if (!Number.isFinite(nextStart) || !Number.isFinite(nextEnd)) return null;
  if (nextEnd <= nextStart) return null;

  const startValue = convertDomainValue(domain[0], nextStart);
  const endValue = convertDomainValue(domain[1], nextEnd);
  if (startValue == null || endValue == null) return null;

  return [startValue, endValue];
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

function PlotAreaClipGroup({ chartId, children }) {
  const { chartValues } = useContext(ChartContext);
  const margin = chartValues?.margin || {};
  const clipX = toNumericSize(margin.left, 0);
  const clipY = toNumericSize(margin.top, 0);
  const clipWidth = toNumericSize(chartValues?.innerWidth, 0);
  const clipHeight = toNumericSize(chartValues?.innerHeight, 0);

  const clipPathId = useMemo(() => {
    const normalizedId = String(chartId || 'chart').replace(
      /[^a-zA-Z0-9_-]/g,
      '',
    );
    return `wizard-charts-plot-clip-${normalizedId || 'default'}`;
  }, [chartId]);

  if (clipWidth <= 0 || clipHeight <= 0) {
    return children;
  }

  return (
    <>
      <defs>
        <clipPath id={clipPathId} clipPathUnits="userSpaceOnUse">
          <rect x={clipX} y={clipY} width={clipWidth} height={clipHeight} />
        </clipPath>
      </defs>
      <g clipPath={`url(#${clipPathId})`}>{children}</g>
    </>
  );
}

function ChartContainer({
  height,
  width,
  margin = { top: 'auto', right: 'auto', bottom: 'auto', left: 'auto' },
  data = [],
  options = {},
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

  const appliedDomainOverrides = useMemo(
    () => (isWheelZoomActive ? xDomainOverrides : { x: null, x2: null }),
    [isWheelZoomActive, xDomainOverrides],
  );

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
        if (zoomBoundsRef.current.x == null) {
          const xDomain = xScaleRef.current?.domain?.();
          if (Array.isArray(xDomain) && xDomain.length === 2) {
            zoomBoundsRef.current.x = [xDomain[0], xDomain[1]];
          }
        }

        nextOverrides.x = buildZoomedDomain(
          xScaleRef.current,
          localX,
          zoomFactor,
          zoomOptions.minWindow,
          zoomBoundsRef.current.x,
        );
      }

      if (zoomableAxes.x2) {
        if (zoomBoundsRef.current.x2 == null) {
          const x2Domain = x2ScaleRef.current?.domain?.();
          if (Array.isArray(x2Domain) && x2Domain.length === 2) {
            zoomBoundsRef.current.x2 = [x2Domain[0], x2Domain[1]];
          }
        }

        nextOverrides.x2 = buildZoomedDomain(
          x2ScaleRef.current,
          localX,
          zoomFactor,
          zoomOptions.minWindow,
          zoomBoundsRef.current.x2,
        );
      }

      if (nextOverrides.x == null && nextOverrides.x2 == null) return;

      setXDomainOverrides((prev) => {
        const xUnchanged =
          prev.x?.[0]?.valueOf?.() === nextOverrides.x?.[0]?.valueOf?.() &&
          prev.x?.[1]?.valueOf?.() === nextOverrides.x?.[1]?.valueOf?.();
        const x2Unchanged =
          prev.x2?.[0]?.valueOf?.() === nextOverrides.x2?.[0]?.valueOf?.() &&
          prev.x2?.[1]?.valueOf?.() === nextOverrides.x2?.[1]?.valueOf?.();

        if (xUnchanged && x2Unchanged) return prev;
        return nextOverrides;
      });
    },
    [
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

  const handleMouseMove = (event) => {
    const svgNode = svgReadoutRef.current;
    if (!svgNode) return;

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
  const handleMouseLeave = () => {
    pendingHoverEventRef.current = null;

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

  // Phase 1: render only an SVG shell so we can measure content-box size first.
  const svgNode = (
    <svg
      ref={svgReadoutRef}
      height={svgHeight}
      width={svgWidth}
      className={className}
      style={{ fontFamily: 'inherit', ...sx }}
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
          <PlotAreaClipGroup chartId={chartId}>
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
