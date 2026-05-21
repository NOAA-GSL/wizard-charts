import { useEffect, useMemo } from 'react';
import { useHoverStoreSnapshot } from '../context/HoverPointProvider';
import { useChartHelpers } from '../hooks/useChartHelpers';
import { useHoverReadoutDebug } from '../hooks/useHoverReadoutDebug';
import { axisHasMappedSeries } from '../utilities/dataUtilities';
import { getPlotBoundsFromChartValues } from '../utilities/measurements';
import Readout from './Readout';

function resolveBandValueAtPixel(scale, pixel) {
  const domain = scale?.domain?.() || [];
  if (!Array.isArray(domain) || domain.length === 0) return null;

  const bandwidth = scale.bandwidth();
  if (!Number.isFinite(bandwidth) || bandwidth <= 0) return null;

  let nearestValue = null;
  let nearestDistance = Infinity;

  domain.forEach((value) => {
    const start = scale(value);
    if (!Number.isFinite(start)) return;

    const center = start + bandwidth / 2;
    const distance = Math.abs(center - pixel);
    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearestValue = value;
    }
  });

  return nearestValue;
}

function resolveScaleValueAtPixel(scale, pixel) {
  if (!scale || !Number.isFinite(pixel)) return null;

  if (typeof scale.invert === 'function') {
    const value = scale.invert(pixel);
    return value == null ? null : value;
  }

  if (typeof scale.bandwidth === 'function') {
    return resolveBandValueAtPixel(scale, pixel);
  }

  return null;
}

function resolveScalePixelForValue(scale, value) {
  if (!scale || value == null) return null;

  const basePixel = scale(value);
  if (!Number.isFinite(basePixel)) return null;

  if (typeof scale.bandwidth === 'function') {
    const bandwidth = scale.bandwidth();
    if (Number.isFinite(bandwidth)) {
      return basePixel + bandwidth / 2;
    }
  }

  return basePixel;
}

function HoverReadoutLayer({
  chartId,
  hoverStore,
  mode,
  readoutOptions,
  plotBoundsRef,
  xValueResolverRef,
}) {
  const { chartValues, computedScales } = useChartHelpers();
  const sharedHoverEvent = useHoverStoreSnapshot(hoverStore);
  const plotBounds = useMemo(
    () => getPlotBoundsFromChartValues(chartValues),
    [chartValues],
  );

  const primaryXScale = computedScales.x?.scale;
  const secondaryXScale = computedScales.x2?.scale;

  const readoutXScale = useMemo(() => {
    const seriesList = chartValues.options?.series || [];
    const hasPrimary = axisHasMappedSeries(seriesList, 'x');
    const hasSecondary = axisHasMappedSeries(seriesList, 'x2');

    if (hasPrimary && primaryXScale) return primaryXScale;
    if (hasSecondary && secondaryXScale) return secondaryXScale;

    return primaryXScale || secondaryXScale;
  }, [chartValues.options?.series, primaryXScale, secondaryXScale]);

  useEffect(() => {
    plotBoundsRef.current = plotBounds;

    return () => {
      if (plotBoundsRef.current === plotBounds) {
        plotBoundsRef.current = null;
      }
    };
  }, [plotBounds, plotBoundsRef]);

  useEffect(() => {
    xValueResolverRef.current = (localX) =>
      resolveScaleValueAtPixel(readoutXScale, localX);

    return () => {
      xValueResolverRef.current = () => null;
    };
  }, [readoutXScale, xValueResolverRef]);

  const hoverEvent = useMemo(() => {
    if (!sharedHoverEvent) return null;
    if (mode !== 'global') return sharedHoverEvent;

    const xValue = sharedHoverEvent.xValue;
    if (xValue == null || !readoutXScale) return null;

    // Align cross-chart readouts by x-domain value, not raw pixel ratio.
    const localX = resolveScalePixelForValue(readoutXScale, xValue);
    if (!Number.isFinite(localX)) return null;

    if (localX < plotBounds.left || localX > plotBounds.right) {
      return null;
    }

    const normalizedPlotY = Number(sharedHoverEvent.normalizedPlotY);
    const localY = Number.isFinite(normalizedPlotY)
      ? plotBounds.top + normalizedPlotY * plotBounds.height
      : Number(sharedHoverEvent.localY);

    return Number.isFinite(localX) && Number.isFinite(localY)
      ? {
          ...sharedHoverEvent,
          localX,
          localY,
        }
      : null;
  }, [mode, plotBounds, readoutXScale, sharedHoverEvent]);

  // Readout payload is computed in a dedicated hook so ChartContainer stays focused on routing events.
  const readoutData = useHoverReadoutDebug({
    chartId,
    hoverEvent,
    mode,
    throttleMs: 100,
    logToConsole: Boolean(readoutOptions?.debug),
  });

  return (
    <Readout
      hoverEvent={hoverEvent}
      readoutData={readoutData}
      options={readoutOptions}
    />
  );
}

export default HoverReadoutLayer;
