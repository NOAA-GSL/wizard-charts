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
import { ChartProvider } from './context/ChartProvider';
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
import Matrix from './plotComponents/Matrix';
import Heatmap from './plotComponents/Heatmap';

const SIZE_EPSILON = 0.25;
const AUTO_SIZE = 'auto';
const DEFAULT_AUTO_WIDTH = 800;
const DEFAULT_AUTO_HEIGHT = 600;

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

  // useMemo to avoid unnecessary re-renders in the useEffect hook of ChartProvider
  const initialValues = useMemo(
    () => ({
      height: contentSize.height,
      width: contentSize.width,
      baseMargin: margin,
      data,
      options: mergeDeep(defaultOptions, options),
    }),
    [contentSize.height, contentSize.width, margin, data, options],
  );

  const configuredHoverMode = initialValues.options?.readout?.hoverMode;
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
  const seriesNodes = initialValues.options.series.map((s, i) => {
    switch (s.type) {
      case 'area':
        return <Area key={s.id ?? i} seriesIndex={i} options={s} />;
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
      default:
        return null;
    }
  });

  const axes = initialValues.options.axes || {};
  const series = initialValues.options.series || [];

  // Phase 1: render only an SVG shell so we can measure content-box size first.
  const svgNode = (
    <svg
      ref={svgReadoutRef}
      height={svgHeight}
      width={svgWidth}
      className={className}
      style={sx}
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
          {seriesNodes}
          <HoverReadoutLayer
            chartId={chartId}
            hoverStore={activeHoverStore}
            mode={effectiveHoverMode}
            readoutOptions={initialValues.options?.readout}
            plotBoundsRef={plotBoundsRef}
            xValueResolverRef={xValueResolverRef}
          />
          <Legend />
          {children}
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
