import {
  formatReadoutXValue,
  formatSeriesReadoutText,
  resolveSeriesReadoutDetailLines,
  resolveSeriesReadoutEntries,
} from '../utilities/readoutHelpers.js';

export function buildReadoutModel({
  hoverEvent,
  readoutData,
  options = {},
  axisKey = 'x',
  series = [],
  getSeriesData,
}) {
  if (!hoverEvent || !readoutData?.isInsidePlot) return null;

  const rows = (readoutData.nearest?.bySeries || []).map((summary) => {
    const config = series[summary.seriesIndex] || {};
    const status = summary.status || 'available';
    const isAvailable = status === 'available';
    const isInterpolated =
      (isAvailable && summary.seriesType === 'heatmap') ||
      (isAvailable &&
        summary.seriesType === 'contourGrid' &&
        summary.values?.samplingMode !== 'nearest') ||
      (isAvailable &&
        summary.seriesType === 'windBarbs' &&
        summary.dataIndex == null);

    return {
      id: config.id ?? summary.seriesIndex,
      status,
      seriesIndex: summary.seriesIndex,
      seriesType: summary.seriesType,
      axisKeys: summary.axisKeys,
      label: summary.seriesName,
      color: summary.readoutColor || '#d4d4d4',
      units: summary.seriesUnits,
      values: summary.values,
      sampling: isInterpolated ? 'interpolate' : 'nearest',
      dataIndex:
        isAvailable && !isInterpolated ? (summary.dataIndex ?? null) : null,
      datum:
        isAvailable && !isInterpolated && summary.dataIndex != null
          ? (getSeriesData?.(summary.seriesIndex)?.[summary.dataIndex] ?? null)
          : null,
      entries: resolveSeriesReadoutEntries(summary, options),
      text: formatSeriesReadoutText(summary, options),
      detailLines: resolveSeriesReadoutDetailLines(summary, options),
      distancePx: summary.distancePx,
      xDistanceValue: summary.xDistanceValue ?? null,
      xExtent: summary.xExtent ?? null,
      sampleX: summary.sampleX ?? summary.values?.x ?? null,
      xPixel: summary.xPixel,
      yPixel: summary.yPixel,
      markerPoints: isAvailable ? summary.markerPoints || [] : [],
    };
  });

  rows.sort((first, second) => {
    if (
      options.rowOrder === 'distance' &&
      first.distancePx !== second.distancePx
    ) {
      return first.distancePx - second.distancePx;
    }
    return first.seriesIndex - second.seriesIndex;
  });

  if (!rows.length) return null;

  return {
    chartId: readoutData.chartId,
    sourceChartId: readoutData.sourceChartId,
    mode: readoutData.mode,
    xValue: hoverEvent.xValue,
    axisKey,
    title: formatReadoutXValue(hoverEvent.xValue, options.titleFormatter, {
      axisKey,
    }),
    local: { x: hoverEvent.localX, y: hoverEvent.localY },
    sourceClient: { x: hoverEvent.clientX, y: hoverEvent.clientY },
    rows,
  };
}

export function placeReadout({ anchor, bounds, width, height, offset = 12 }) {
  const availableWidth = Math.max(0, bounds.right - bounds.left);
  const availableHeight = Math.max(0, bounds.bottom - bounds.top);
  if (!availableWidth || !availableHeight) return null;

  const boxWidth = Math.min(Math.max(0, width), availableWidth);
  const boxHeight = Math.min(Math.max(0, height), availableHeight);
  const gap = Number.isFinite(offset) ? Math.max(0, offset) : 12;
  const rightSpace = bounds.right - anchor.x - gap;
  const leftSpace = anchor.x - gap - bounds.left;
  const useLeft = rightSpace < boxWidth && leftSpace > rightSpace;
  const desiredLeft = useLeft ? anchor.x - gap - boxWidth : anchor.x + gap;

  return {
    left: Math.max(bounds.left, Math.min(desiredLeft, bounds.right - boxWidth)),
    top: Math.max(
      bounds.top,
      Math.min(anchor.y - boxHeight / 2, bounds.bottom - boxHeight),
    ),
    maxWidth: availableWidth,
    maxHeight: availableHeight,
  };
}
