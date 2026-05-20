import { useContext, useEffect, useId, useMemo, useRef } from 'react';
import { ChartProvider } from './context/ChartProvider';
import {
  createHoverStore,
  HoverProviderContext,
  HoverStoreContext,
  useHoverStoreSnapshot,
} from './context/HoverPointProvider';
import ErrorBoundary from './ErrorBoundary';
import { pointer } from 'd3';
import { useHoverReadoutDebug } from './hooks/useHoverReadoutDebug';
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

function HoverReadoutDebugReporter({
  chartId,
  hoverStore,
  mode,
  width,
  height,
}) {
  const sharedHoverEvent = useHoverStoreSnapshot(hoverStore);

  const hoverEvent = useMemo(() => {
    if (!sharedHoverEvent) return null;
    if (mode !== 'global') return sharedHoverEvent;

    const normalizedX = Number(sharedHoverEvent.normalizedX);
    const normalizedY = Number(sharedHoverEvent.normalizedY);
    const widthValue = Number(width);
    const heightValue = Number(height);

    // Reproject provider-shared normalized coordinates into this chart's local pixel space.
    const localX =
      Number.isFinite(normalizedX) &&
      Number.isFinite(widthValue) &&
      widthValue > 0
        ? normalizedX * widthValue
        : Number(sharedHoverEvent.localX);
    const localY =
      Number.isFinite(normalizedY) &&
      Number.isFinite(heightValue) &&
      heightValue > 0
        ? normalizedY * heightValue
        : Number(sharedHoverEvent.localY);

    return Number.isFinite(localX) && Number.isFinite(localY)
      ? {
          ...sharedHoverEvent,
          localX,
          localY,
        }
      : null;
  }, [height, mode, sharedHoverEvent, width]);

  // Keep readout debug logic in a dedicated hook so ChartContainer stays focused on routing events.
  useHoverReadoutDebug({
    chartId,
    hoverEvent,
    mode,
    throttleMs: 100,
  });

  return null;
}

function ChartContainer({
  height = 600,
  width = 800,
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
  const pendingHoverEventRef = useRef(null);
  const hoverRafRef = useRef(null);
  const hasWarnedMissingProviderRef = useRef(false);

  // useMemo to avoid unnecessary re-renders in the useEffect hook of ChartProvider
  const initialValues = useMemo(
    () => ({
      height,
      width,
      baseMargin: margin,
      data,
      options: mergeDeep(defaultOptions, options),
    }),
    [height, width, margin, data, options],
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

  const handleMouseMove = (event) => {
    const svgNode = svgReadoutRef.current;
    if (!svgNode) return;

    const [localX, localY] = pointer(event, svgNode);
    const rect = svgNode.getBoundingClientRect();
    const widthPx = rect.width || Number(width) || 0;
    const heightPx = rect.height || Number(height) || 0;

    // Include normalized coordinates so other charts in a global group can map hover consistently.
    const hoverEvent = {
      sourceChartId: chartId,
      clientX: event.clientX,
      clientY: event.clientY,
      localX,
      localY,
      normalizedX: widthPx > 0 ? localX / widthPx : null,
      normalizedY: heightPx > 0 ? localY / heightPx : null,
      timestamp: Date.now(),
    };

    pendingHoverEventRef.current = hoverEvent;

    if (hoverRafRef.current != null) {
      return;
    }

    if (
      typeof window === 'undefined' ||
      typeof window.requestAnimationFrame !== 'function'
    ) {
      activeHoverStore.setSnapshot(hoverEvent);
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

  return (
    <ChartProvider initialValues={initialValues}>
      <ErrorBoundary>
        <HoverReadoutDebugReporter
          chartId={chartId}
          hoverStore={activeHoverStore}
          mode={effectiveHoverMode}
          width={width}
          height={height}
        />
        <svg
          ref={svgReadoutRef}
          height={height}
          width={width}
          className={className}
          style={sx}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
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
          <Legend />
          {children}
        </svg>
      </ErrorBoundary>
    </ChartProvider>
  );
}

export default ChartContainer;
