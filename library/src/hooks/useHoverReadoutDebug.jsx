import { useEffect, useMemo, useRef } from 'react';
import { useChartHelpers } from './useChartHelpers';
import {
  buildContinuousXMap,
  buildPreparedHeatmapPoints,
  getDistanceToCellRect,
  getMatrixCellRect,
  interpolateIdwValueAtPoint,
  invertScaleAtPixel,
  isPointInsideScaleRanges,
} from '../utilities/heatmapMatrixHelpers';
import {
  resolveSeriesReadoutEntries,
  resolveSeriesValue,
} from '../utilities/readoutHelpers';
import { toComparable } from '../utilities/valueUtilities';

const SUPPORTED_SERIES_TYPES = new Set([
  'area',
  'bar',
  'boxPlot',
  'circle',
  'heatmap',
  'line',
  'matrix',
]);

function toNumberOrNull(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function getAlignmentMode(rawAlignment) {
  const alignment =
    typeof rawAlignment === 'string' ? rawAlignment.toLowerCase() : 'center';

  if (alignment === 'left' || alignment === 'start') return 'left';
  if (alignment === 'right' || alignment === 'end') return 'right';
  return 'center';
}

function getSeriesRectWidth({
  accessors,
  innerWidth,
  series,
  seriesData,
  xScale,
}) {
  const seriesType = series?.type;
  if (
    (seriesType !== 'bar' && seriesType !== 'boxPlot') ||
    !Array.isArray(seriesData)
  ) {
    return null;
  }

  const positions = seriesData
    .map((datum) => xScale(accessors.x?.(datum)))
    .filter((pixel) => Number.isFinite(pixel))
    .sort((a, b) => a - b);

  let step = 0;
  if (positions.length > 1) {
    const diffs = positions
      .slice(1)
      .map((value, index) => value - positions[index]);
    step = Math.max(0, Math.min(...diffs));
  }

  const fallback = (Number(innerWidth) || 0) / Math.max(1, seriesData.length);
  const paddingFactor = Number.isFinite(Number(series?.paddingFactor))
    ? Number(series.paddingFactor)
    : 0.8;

  let rectWidth = (step || fallback) * paddingFactor;

  // Bar uses band width when available; boxPlot currently uses computed step width.
  if (seriesType === 'bar' && typeof xScale.bandwidth === 'function') {
    rectWidth = xScale.bandwidth() * paddingFactor;
  }

  return Number.isFinite(rectWidth) && rectWidth > 0 ? rectWidth : null;
}

function getXCenter(xScale, xValue) {
  const x = xScale?.(xValue);
  if (!Number.isFinite(x)) return null;

  // Band scales report bucket starts; use bucket centers for distance comparisons.
  if (typeof xScale.bandwidth === 'function') {
    const bandwidth = xScale.bandwidth();
    if (Number.isFinite(bandwidth)) {
      return x + bandwidth / 2;
    }
  }

  return x;
}

function getBarCenterX({ alignment, rectWidth, xScale, xValue }) {
  const scaleCenter = getXCenter(xScale, xValue);
  if (!Number.isFinite(scaleCenter)) return null;

  if (!Number.isFinite(rectWidth)) return scaleCenter;

  if (typeof xScale.bandwidth === 'function') {
    const bandStart = xScale(xValue);
    const band = xScale.bandwidth();

    if (!Number.isFinite(bandStart) || !Number.isFinite(band)) return null;

    if (alignment === 'left') return bandStart + rectWidth / 2;
    if (alignment === 'right') return bandStart + band - rectWidth / 2;
    return bandStart + band / 2;
  }

  if (alignment === 'left') return scaleCenter - rectWidth / 2;
  if (alignment === 'right') return scaleCenter + rectWidth / 2;
  return scaleCenter;
}

function getBoxPlotCenterX({ alignment, rectWidth, xScale, xValue }) {
  const x = xScale?.(xValue);
  if (!Number.isFinite(x)) return null;

  if (!Number.isFinite(rectWidth)) return x;

  if (alignment === 'left') return x - rectWidth / 2;
  if (alignment === 'right') return x + rectWidth / 2;
  return x;
}

function getSeriesCenterX({ rectWidth, series, xScale, xValue }) {
  if (series?.type === 'bar') {
    return getBarCenterX({
      alignment: getAlignmentMode(series?.alignment),
      rectWidth,
      xScale,
      xValue,
    });
  }

  if (series?.type === 'boxPlot') {
    return getBoxPlotCenterX({
      alignment: getAlignmentMode(series?.alignment),
      rectWidth,
      xScale,
      xValue,
    });
  }

  return getXCenter(xScale, xValue);
}

function buildValueSummary(seriesType, accessors, datum) {
  const x = accessors.x?.(datum);

  // Preserve plot-specific value structures so debug output resembles the rendered glyph semantics.
  if (seriesType === 'boxPlot') {
    const baseY = accessors.y?.(datum);
    const q1 = accessors.q1YKey ? accessors.q1YKey(datum) : baseY;
    const q3 = accessors.q3YKey ? accessors.q3YKey(datum) : baseY;
    const median = accessors.medianYKey ? accessors.medianYKey(datum) : baseY;
    const min = accessors.minYKey ? accessors.minYKey(datum) : undefined;
    const max = accessors.maxYKey ? accessors.maxYKey(datum) : undefined;

    return {
      x,
      q1,
      q3,
      median,
      min,
      max,
    };
  }

  if (seriesType === 'area') {
    const baseY = accessors.y?.(datum);
    const lower = accessors.q1YKey ? accessors.q1YKey(datum) : baseY;
    const upper = accessors.q3YKey ? accessors.q3YKey(datum) : baseY;
    const min = accessors.minYKey ? accessors.minYKey(datum) : undefined;
    const max = accessors.maxYKey ? accessors.maxYKey(datum) : undefined;

    return {
      x,
      y: baseY,
      lower,
      upper,
      min,
      max,
    };
  }

  return {
    x,
    y: accessors.y?.(datum),
  };
}

function getRepresentativeYPixel(seriesType, yScale, summary, readoutOptions) {
  if (!yScale) return null;

  const configuredValue = toNumberOrNull(
    resolveSeriesValue({ seriesType, values: summary }, readoutOptions),
  );
  if (configuredValue != null) {
    const configuredY = yScale(configuredValue);
    if (Number.isFinite(configuredY)) return configuredY;
  }

  if (seriesType === 'boxPlot') {
    // Prefer median for nearest-point ranking; fall back to box midpoint when median is unavailable.
    const median = toNumberOrNull(summary.median);
    if (median != null) return yScale(median);

    const q1 = toNumberOrNull(summary.q1);
    const q3 = toNumberOrNull(summary.q3);
    if (q1 != null && q3 != null) return yScale((q1 + q3) / 2);

    return null;
  }

  if (seriesType === 'area') {
    const lower = toNumberOrNull(summary.lower);
    const upper = toNumberOrNull(summary.upper);
    if (lower != null && upper != null) {
      return yScale((lower + upper) / 2);
    }

    const y = toNumberOrNull(summary.y);
    return y != null ? yScale(y) : null;
  }

  const y = toNumberOrNull(summary.y);
  return y != null ? yScale(y) : null;
}

function resolveSeriesReadoutColor(series) {
  const fill =
    typeof series?.fill === 'string' && series.fill !== 'none'
      ? series.fill
      : null;
  const stroke =
    typeof series?.stroke === 'string' && series.stroke !== 'none'
      ? series.stroke
      : null;
  const whisker =
    typeof series?.strokeWhisker === 'string' && series.strokeWhisker !== 'none'
      ? series.strokeWhisker
      : null;

  if (series?.type === 'line') return stroke || fill || '#d4d4d4';
  if (series?.type === 'area') return whisker || stroke || fill || '#d4d4d4';
  if (series?.type === 'boxPlot') {
    return whisker || stroke || fill || '#d4d4d4';
  }

  return fill || stroke || '#d4d4d4';
}

function buildSeriesMarkerPoints({
  seriesType,
  values,
  xPixel,
  yScale,
  readoutOptions,
}) {
  if (!Number.isFinite(xPixel) || !yScale) return [];

  const entries = resolveSeriesReadoutEntries(
    { seriesType, values },
    readoutOptions,
  );

  return entries
    .map((entry, index) => {
      const yValue = toNumberOrNull(entry?.value);
      if (yValue == null) return null;

      const yPixel = yScale(yValue);
      if (!Number.isFinite(yPixel)) return null;

      const key =
        typeof entry?.key === 'string' && entry.key.length > 0
          ? entry.key
          : `value-${index}`;

      return {
        id: `${key}-${index}`,
        xPixel,
        yPixel,
      };
    })
    .filter(Boolean);
}

function summarizeSeriesPoint({
  accessors,
  dataIndex,
  datum,
  hoverX,
  hoverY,
  rectWidth,
  readoutOptions,
  series,
  seriesIndex,
  xScale,
  yScale,
  axisKeys,
}) {
  const seriesType = series?.type;
  if (seriesType === 'heatmap' || seriesType === 'matrix') return null;

  const xValue = accessors.x?.(datum);
  if (xValue == null) return null;

  const xPixel = getSeriesCenterX({ rectWidth, series, xScale, xValue });
  if (!Number.isFinite(xPixel)) return null;

  const values = buildValueSummary(seriesType, accessors, datum);
  const yPixel = getRepresentativeYPixel(
    seriesType,
    yScale,
    values,
    readoutOptions,
  );
  const markerPoints = buildSeriesMarkerPoints({
    seriesType,
    values,
    xPixel,
    yScale,
    readoutOptions,
  });

  const xDistancePx = Math.abs(xPixel - hoverX);
  const yDistancePx = Number.isFinite(yPixel)
    ? Math.abs(yPixel - hoverY)
    : null;
  const distancePx =
    yDistancePx == null ? xDistancePx : Math.hypot(xDistancePx, yDistancePx);

  return {
    axisKeys,
    dataIndex,
    distancePx,
    readoutColor: resolveSeriesReadoutColor(series),
    seriesIndex,
    seriesName: series?.name || `Series ${seriesIndex + 1}`,
    seriesType,
    values,
    xDistancePx,
    xPixel,
    yDistancePx,
    yPixel: Number.isFinite(yPixel) ? yPixel : null,
    markerPoints,
  };
}

function isBetterByXThenDistance(summary, previous) {
  if (!previous) return true;
  if (summary.xDistancePx < previous.xDistancePx) return true;

  return (
    summary.xDistancePx === previous.xDistancePx &&
    summary.distancePx < previous.distancePx
  );
}

function summarizeMatrixSeriesPoint({
  accessors,
  axisKeys,
  hoverX,
  hoverY,
  series,
  seriesData,
  seriesIndex,
  xScale,
  yScale,
}) {
  const xIsBand = typeof xScale?.bandwidth === 'function';
  const useContinuousX = !xIsBand;

  const continuousXMap =
    useContinuousX && typeof accessors?.x === 'function'
      ? buildContinuousXMap(seriesData, accessors.x, xScale)
      : new Map();

  let nearest = null;

  for (let dataIndex = 0; dataIndex < seriesData.length; dataIndex += 1) {
    const datum = seriesData[dataIndex];
    const xValue = accessors.x?.(datum);
    const yValue = accessors.y?.(datum);
    if (xValue == null || yValue == null) continue;

    const cellRect = getMatrixCellRect({
      xValue,
      yValue,
      xScale,
      yScale,
      xIsBand,
      useContinuousX,
      continuousXMap,
      timeAnchor: series?.timeAnchor,
      cellWidthFactor: series?.cellWidthFactor,
      cellPadding: series?.cellPadding,
    });
    if (!cellRect) continue;

    const metrics = getDistanceToCellRect(hoverX, hoverY, cellRect);
    if (!metrics) continue;

    const value = accessors.valueKey?.(datum);
    const label = accessors.labelKey ? accessors.labelKey(datum) : value;

    const summary = {
      axisKeys,
      dataIndex,
      distancePx: metrics.distancePx,
      readoutColor: resolveSeriesReadoutColor(series),
      seriesIndex,
      seriesName: series?.name || `Series ${seriesIndex + 1}`,
      seriesType: 'matrix',
      values: {
        x: xValue,
        y: yValue,
        value,
        label,
        containsHover: metrics.containsPoint,
        cellBounds: metrics.bounds,
      },
      xDistancePx: metrics.xDistancePx,
      xPixel: metrics.xCenter,
      yDistancePx: metrics.yDistancePx,
      yPixel: metrics.yCenter,
    };

    // Matrix has explicit rectangular cells; if we're inside one, that's the readout target.
    if (metrics.containsPoint) {
      return summary;
    }

    if (isBetterByXThenDistance(summary, nearest)) {
      nearest = summary;
    }
  }

  return nearest;
}

function summarizeHeatmapSeriesPoint({
  accessors,
  axisKeys,
  hoverX,
  hoverY,
  series,
  seriesData,
  seriesIndex,
  xScale,
  yScale,
}) {
  if (!isPointInsideScaleRanges(hoverX, hoverY, xScale, yScale)) {
    return null;
  }

  const xValue = invertScaleAtPixel(xScale, hoverX);
  const yValue = invertScaleAtPixel(yScale, hoverY);
  const comparableX = toComparable(xValue);
  const comparableY = toComparable(yValue);

  if (comparableX == null || comparableY == null) {
    return null;
  }

  const preparedPoints = buildPreparedHeatmapPoints(
    seriesData,
    accessors,
    xScale,
    yScale,
  );
  if (preparedPoints.length === 0) return null;

  const xDomain = typeof xScale.domain === 'function' ? xScale.domain() : [];
  const yDomain = typeof yScale.domain === 'function' ? yScale.domain() : [];
  const xDomainMin = toComparable(xDomain[0]);
  const xDomainMax = toComparable(xDomain[1]);
  const yDomainMin = toComparable(yDomain[0]);
  const yDomainMax = toComparable(yDomain[1]);

  const interpolatedValue = interpolateIdwValueAtPoint({
    points: preparedPoints,
    x: comparableX,
    y: comparableY,
    xSpan:
      xDomainMin != null && xDomainMax != null
        ? Math.abs(xDomainMax - xDomainMin)
        : null,
    ySpan:
      yDomainMin != null && yDomainMax != null
        ? Math.abs(yDomainMax - yDomainMin)
        : null,
    power: series?.idwPower,
    neighbors: series?.idwNeighbors,
  });

  if (!Number.isFinite(interpolatedValue)) {
    return null;
  }

  let nearestSample = null;
  preparedPoints.forEach((point) => {
    const distancePx = Math.hypot(point.xPixel - hoverX, point.yPixel - hoverY);

    if (!nearestSample || distancePx < nearestSample.distancePx) {
      nearestSample = {
        dataIndex: point.dataIndex,
        distancePx,
        x: point.xRaw,
        y: point.yRaw,
        value: point.value,
      };
    }
  });

  return {
    axisKeys,
    dataIndex: nearestSample?.dataIndex ?? null,
    distancePx: 0,
    readoutColor: resolveSeriesReadoutColor(series),
    seriesIndex,
    seriesName: series?.name || `Series ${seriesIndex + 1}`,
    seriesType: 'heatmap',
    values: {
      x: xValue,
      y: yValue,
      value: interpolatedValue,
      interpolationMethod: series?.interpolationMethod || 'idw',
      nearestSample: nearestSample
        ? {
            x: nearestSample.x,
            y: nearestSample.y,
            value: nearestSample.value,
            distancePx: nearestSample.distancePx,
          }
        : null,
    },
    xDistancePx: 0,
    xPixel: hoverX,
    yDistancePx: 0,
    yPixel: hoverY,
  };
}

export function useHoverReadoutDebug({
  chartId,
  hoverEvent,
  mode = 'local',
  throttleMs = 100,
  logToConsole = false,
  readoutOptions = {},
}) {
  const { chartValues, getAccessors, getSeriesData, getSeriesScales } =
    useChartHelpers();
  const lastLogAtRef = useRef(0);

  const debugPayload = useMemo(() => {
    if (!hoverEvent) return null;

    const localX = Number(hoverEvent.localX);
    const localY = Number(hoverEvent.localY);

    if (!Number.isFinite(localX) || !Number.isFinite(localY)) {
      return null;
    }

    const seriesList = chartValues.options?.series || [];

    const bySeries = seriesList
      .map((series, seriesIndex) => {
        if (!SUPPORTED_SERIES_TYPES.has(series?.type)) {
          return null;
        }

        const accessors = getAccessors(seriesIndex);
        const seriesData = getSeriesData(seriesIndex);
        const { xScale, yScale, axisKeys } = getSeriesScales(seriesIndex);

        if (!xScale || !yScale || !Array.isArray(seriesData)) {
          return null;
        }

        const rectWidth = getSeriesRectWidth({
          accessors,
          innerWidth: chartValues.innerWidth,
          series,
          seriesData,
          xScale,
        });

        if (series.type === 'matrix') {
          return summarizeMatrixSeriesPoint({
            accessors,
            axisKeys,
            hoverX: localX,
            hoverY: localY,
            series,
            seriesData,
            seriesIndex,
            xScale,
            yScale,
          });
        }

        if (series.type === 'heatmap') {
          return summarizeHeatmapSeriesPoint({
            accessors,
            axisKeys,
            hoverX: localX,
            hoverY: localY,
            series,
            seriesData,
            seriesIndex,
            xScale,
            yScale,
          });
        }

        let nearest = null;

        seriesData.forEach((datum, dataIndex) => {
          const summary = summarizeSeriesPoint({
            accessors,
            axisKeys,
            dataIndex,
            datum,
            hoverX: localX,
            hoverY: localY,
            rectWidth,
            readoutOptions,
            series,
            seriesIndex,
            xScale,
            yScale,
          });

          if (!summary) return;

          // Rank by x-distance first for a stable cross-series readout column.
          if (isBetterByXThenDistance(summary, nearest)) {
            nearest = summary;
          }
        });

        return nearest;
      })
      .filter(Boolean)
      .sort((a, b) => a.distancePx - b.distancePx);

    if (bySeries.length === 0) return null;

    const margin = chartValues.margin || {
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
    };
    const innerWidth = Number(chartValues.innerWidth) || 0;
    const innerHeight = Number(chartValues.innerHeight) || 0;

    const plotBounds = {
      top: margin.top,
      right: margin.left + innerWidth,
      bottom: margin.top + innerHeight,
      left: margin.left,
    };

    const isInsidePlot =
      localX >= plotBounds.left &&
      localX <= plotBounds.right &&
      localY >= plotBounds.top &&
      localY <= plotBounds.bottom;

    return {
      mode,
      timestamp: Number.isFinite(Number(hoverEvent.timestamp))
        ? Number(hoverEvent.timestamp)
        : null,
      sourceChartId: hoverEvent.sourceChartId || chartId,
      chartId,
      isInsidePlot,
      coordinates: {
        local: {
          x: localX,
          y: localY,
        },
        normalized: {
          x: Number.isFinite(Number(hoverEvent.normalizedX))
            ? Number(hoverEvent.normalizedX)
            : null,
          y: Number.isFinite(Number(hoverEvent.normalizedY))
            ? Number(hoverEvent.normalizedY)
            : null,
        },
        client: {
          x: Number.isFinite(Number(hoverEvent.clientX))
            ? Number(hoverEvent.clientX)
            : null,
          y: Number.isFinite(Number(hoverEvent.clientY))
            ? Number(hoverEvent.clientY)
            : null,
        },
      },
      nearest: {
        overall: bySeries[0] || null,
        bySeries,
      },
      plotBounds,
    };
  }, [
    chartId,
    chartValues.innerHeight,
    chartValues.innerWidth,
    chartValues.margin,
    chartValues.options?.series,
    getAccessors,
    getSeriesData,
    getSeriesScales,
    hoverEvent,
    mode,
    readoutOptions,
  ]);

  useEffect(() => {
    if (!debugPayload || !logToConsole) return;

    const now = Date.now();
    // Throttle logs to keep console output readable while hovering.
    if (now - lastLogAtRef.current < throttleMs) {
      return;
    }

    lastLogAtRef.current = now;

    if (typeof console === 'undefined' || typeof console.debug !== 'function') {
      return;
    }

    console.debug('[wizard-charts][hover-readout]', debugPayload);
  }, [debugPayload, logToConsole, throttleMs]);

  return debugPayload;
}
