import {
  axisHasMappedSeries,
  createAccessor,
  getSeriesForAxis,
  isXValueAxis,
} from './dataUtilities';
import {
  defaultContourGridOptions,
  defaultHeatmapOptions,
  defaultMatrixOptions,
} from './defaultOptions';
import { getNumericExtent, resolveThresholds } from './thresholdUtilities';
import { toComparable } from './valueUtilities';

import {
  AXIS_KEYS,
  DEFAULT_AUTO_MARGIN,
  AXIS_LABEL_GAP,
  AXIS_MEASUREMENT_BUFFER,
  LEGEND_MARKER_TEXT_GAP,
  LEGEND_COLORBAR_LABEL_GAP,
  LEGEND_COLORBAR_TICK_LABEL_GAP,
  DEFAULT_TICK_COLLISION_MIN_GAP,
} from './constants';

// setting up canvas outside of function to prevent repeated creation
const canvas =
  typeof document !== 'undefined' ? document.createElement('canvas') : null;
const context = canvas ? canvas.getContext('2d') : null;

function resolveInheritedFontFamily(fallbackFamily = 'sans-serif') {
  if (
    typeof window === 'undefined' ||
    typeof document === 'undefined' ||
    typeof window.getComputedStyle !== 'function' ||
    !document.body
  ) {
    return fallbackFamily;
  }

  const bodyFamily = window.getComputedStyle(document.body).fontFamily;
  if (typeof bodyFamily === 'string' && bodyFamily.trim().length > 0) {
    return bodyFamily;
  }

  return fallbackFamily;
}

function normalizeCanvasFontString(font, fallbackFamily = 'sans-serif') {
  const fontString = String(font ?? '').trim();
  if (!fontString) {
    return `400 12px ${fallbackFamily}`;
  }

  if (!/\binherit\b/i.test(fontString)) {
    return fontString;
  }

  const resolvedFamily = resolveInheritedFontFamily(fallbackFamily);
  return fontString.replace(/\binherit\b/gi, resolvedFamily);
}

function toNumber(value, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function toNonNegativeNumber(value, fallback = 0) {
  return Math.max(0, toNumber(value, fallback));
}

function normalizeFontFamily(fontFamily, fallbackFamily) {
  if (typeof fontFamily !== 'string') return fallbackFamily;

  const trimmedFamily = fontFamily.trim();
  if (!trimmedFamily || trimmedFamily.toLowerCase() === 'inherit') {
    return fallbackFamily;
  }

  return trimmedFamily;
}

function toFontString(fontWeight, fontSize, fontFamily, fallbackFamily) {
  const safeWeight = fontWeight ?? 400;
  const safeSize = toNonNegativeNumber(fontSize, 12) || 12;
  const safeFamily = normalizeFontFamily(fontFamily, fallbackFamily);
  return `${safeWeight} ${safeSize}px ${safeFamily}`;
}

function getSideForAxis(axisKey) {
  if (axisKey === 'x') return 'bottom';
  if (axisKey === 'x2') return 'top';
  if (axisKey === 'y2') return 'right';
  return 'left';
}

function normalizeUnitsText(value) {
  if (typeof value !== 'string') return '';

  const units = value.trim();
  return units.length > 0 ? units : '';
}

function getAxisLabelText(axisOptions = {}) {
  const text = axisOptions.label?.text;
  const labelText = text == null ? '' : String(text);
  const labelHasContent = labelText.trim().length > 0;

  const shouldDisplayUnits = axisOptions?.displayUnits !== false;
  const unitsText = shouldDisplayUnits
    ? normalizeUnitsText(axisOptions?.units)
    : '';

  if (!unitsText) return labelText;
  if (!labelHasContent) return unitsText;

  return `${labelText} (${unitsText})`;
}

function getAxisTickPosition(axisScale, value) {
  const basePosition = axisScale(value);
  if (!Number.isFinite(basePosition)) return null;

  if (typeof axisScale.bandwidth === 'function') {
    return basePosition + axisScale.bandwidth() / 2;
  }

  return basePosition;
}

function getAxisEdgeOverflow({
  axisKey,
  axisScale,
  ticks,
  axisLabelText,
  axisLabelDimensions,
  chartWidth,
  chartHeight,
}) {
  const overflow = { top: 0, right: 0, bottom: 0, left: 0 };

  if (!axisScale || typeof axisScale.range !== 'function') {
    return overflow;
  }

  const axisRange = axisScale.range();
  const rangeStart = Math.min(...axisRange);
  const rangeEnd = Math.max(...axisRange);
  const isXAxis = isXValueAxis(axisKey);

  ticks.forEach((tick) => {
    if (!tick.showLabel) return;
    const tickPosition = getAxisTickPosition(axisScale, tick.value);
    if (!Number.isFinite(tickPosition)) return;
    const bounds = tick.labelGeometry.bounds;

    if (isXAxis) {
      const labelLeft = tickPosition + bounds.left;
      const labelRight = tickPosition + bounds.right;

      overflow.left = Math.max(overflow.left, Math.max(0, -labelLeft));
      overflow.right = Math.max(
        overflow.right,
        Math.max(0, labelRight - chartWidth),
      );

      return;
    }

    const labelTop = tickPosition + bounds.top;
    const labelBottom = tickPosition + bounds.bottom;

    overflow.top = Math.max(overflow.top, Math.max(0, -labelTop));
    overflow.bottom = Math.max(
      overflow.bottom,
      Math.max(0, labelBottom - chartHeight),
    );
  });

  if (!axisLabelText) return overflow;

  if (isXAxis) {
    const axisLabelX = (rangeStart + rangeEnd) / 2;
    const halfLabelWidth = axisLabelDimensions.width / 2;
    const labelLeft = axisLabelX - halfLabelWidth;
    const labelRight = axisLabelX + halfLabelWidth;

    overflow.left = Math.max(overflow.left, Math.max(0, -labelLeft));
    overflow.right = Math.max(
      overflow.right,
      Math.max(0, labelRight - chartWidth),
    );

    return overflow;
  }

  const axisLabelY = (rangeStart + rangeEnd) / 2;
  const halfLabelHeight = axisLabelDimensions.height / 2;
  const labelTop = axisLabelY - halfLabelHeight;
  const labelBottom = axisLabelY + halfLabelHeight;

  overflow.top = Math.max(overflow.top, Math.max(0, -labelTop));
  overflow.bottom = Math.max(
    overflow.bottom,
    Math.max(0, labelBottom - chartHeight),
  );

  return overflow;
}

function getTickLabelGeometry({ axisKey, angle, label, tickFont }) {
  const isXAxis = isXValueAxis(axisKey);
  const isSecondaryAxis = axisKey === 'x2' || axisKey === 'y2';
  const textAnchor = isXAxis
    ? angle === 0
      ? 'middle'
      : angle < 0 !== isSecondaryAxis
        ? 'end'
        : 'start'
    : isSecondaryAxis
      ? 'start'
      : 'end';
  const { width, height } = getTextDimensions(label, tickFont);
  const left =
    textAnchor === 'end' ? -width : textAnchor === 'start' ? 0 : -width / 2;
  const radians = (angle * Math.PI) / 180;
  const cosine = Math.cos(radians);
  const sine = Math.sin(radians);
  const corners = [
    [left, -height / 2],
    [left + width, -height / 2],
    [left, height / 2],
    [left + width, height / 2],
  ].map(([horizontal, vertical]) => ({
    x: horizontal * cosine - vertical * sine,
    y: horizontal * sine + vertical * cosine,
  }));
  const minX = Math.min(...corners.map((corner) => corner.x));
  const maxX = Math.max(...corners.map((corner) => corner.x));
  const minY = Math.min(...corners.map((corner) => corner.y));
  const maxY = Math.max(...corners.map((corner) => corner.y));
  const offsetX = isXAxis ? 0 : isSecondaryAxis ? -minX : -maxX;
  const offsetY = isXAxis ? (isSecondaryAxis ? -maxY : -minY) : 0;

  return {
    angle,
    textAnchor,
    offsetX,
    offsetY,
    bounds: {
      left: minX + offsetX,
      right: maxX + offsetX,
      top: minY + offsetY,
      bottom: maxY + offsetY,
    },
  };
}

function resolveAxisTickLabels({
  axisKey,
  axisScale,
  ticks,
  tickFont,
  angle,
  reduceLabels,
  minGap = DEFAULT_TICK_COLLISION_MIN_GAP,
}) {
  const isXAxis = isXValueAxis(axisKey);
  const gap = toNonNegativeNumber(minGap, DEFAULT_TICK_COLLISION_MIN_GAP);
  const resolvedTicks = ticks.map((tick) => ({
    ...tick,
    showLabel: tick.label !== '',
    labelGeometry: getTickLabelGeometry({
      axisKey,
      angle,
      label: tick.label,
      tickFont,
    }),
  }));
  if (!reduceLabels) return resolvedTicks;

  const occupiedRanges = resolvedTicks
    .filter((tick) => tick.showLabel)
    .map((tick) => {
      const position = getAxisTickPosition(axisScale, tick.value);
      const bounds = tick.labelGeometry.bounds;
      return {
        tick,
        start: position + (isXAxis ? bounds.left : bounds.top),
        end: position + (isXAxis ? bounds.right : bounds.bottom),
      };
    });
  occupiedRanges.sort(
    (first, second) => first.end - second.end || first.start - second.start,
  );

  let previousEnd = -Infinity;
  occupiedRanges.forEach(({ tick, start, end }) => {
    tick.showLabel = start >= previousEnd + gap;
    if (tick.showLabel) previousEnd = end;
  });

  return resolvedTicks;
}

export function getTickValueKey(value) {
  return value instanceof Date ? `d:${value.getTime()}` : `v:${String(value)}`;
}

function getDataAlignedXTickValues(chartValues, axisKey) {
  if (!isXValueAxis(axisKey)) return [];

  const series = chartValues.options?.series || [];
  const rootData = Array.isArray(chartValues.data) ? chartValues.data : [];
  const matchingSeries = getSeriesForAxis(series, axisKey);
  const hasOnlyMatrixSeries =
    matchingSeries.length > 0 &&
    matchingSeries.every((seriesEntry) => seriesEntry?.type === 'matrix');

  if (!hasOnlyMatrixSeries) return [];

  const tickValues = [];
  const seen = new Set();

  matchingSeries.forEach((s) => {
    if (!s?.xKey) return;

    const getX = createAccessor(s.xKey);
    const seriesData = Array.isArray(s?.data) ? s.data : rootData;

    seriesData.forEach((d) => {
      const v = getX(d);
      if (v == null) return;

      const key = getTickValueKey(v);
      if (seen.has(key)) return;

      seen.add(key);
      tickValues.push(v);
    });
  });

  const sortedTickValues = tickValues.slice().sort((a, b) => {
    const comparableA = toComparable(a);
    const comparableB = toComparable(b);

    if (comparableA == null && comparableB == null) return 0;
    if (comparableA == null) return 1;
    if (comparableB == null) return -1;
    return comparableA - comparableB;
  });

  return sortedTickValues;
}

function normalizeTickValues(values) {
  return Array.isArray(values) && values.length > 0 ? values : null;
}

function normalizeTickLabels(labels) {
  return Array.isArray(labels) && labels.length > 0 ? labels : null;
}

function getLegendLabel(series, index) {
  const explicitName =
    typeof series?.name === 'string' ? series.name.trim() : '';
  if (explicitName) return explicitName;

  if (series?.yKey != null && series?.yKey !== '') {
    return String(series.yKey);
  }

  return `Series ${index + 1}`;
}

function resolveLegendColor(series) {
  const fill = series?.fill;
  const stroke = series?.stroke;
  const strokeWhisker = series?.strokeWhisker;
  const medianStroke = series?.medianStroke;
  const color = series?.color;
  const type = series?.type;
  const hasFill = typeof fill === 'string' && fill !== 'none';

  if (type === 'line') return stroke || fill || 'currentColor';
  if (type === 'circle') return fill || stroke || 'currentColor';
  if (type === 'windBarbs') return color || 'currentColor';
  if (type === 'area') {
    return hasFill ? fill : stroke || strokeWhisker || 'currentColor';
  }
  if (type === 'areaStacked') {
    const resolveStyleColor = (value) => {
      const candidate = Array.isArray(value) ? value[value.length - 1] : value;
      if (typeof candidate !== 'string') return null;
      const trimmed = candidate.trim();
      return trimmed && trimmed !== 'none' ? trimmed : null;
    };

    const medianColor = resolveStyleColor(medianStroke);
    const bandColors = Array.isArray(series?.bands)
      ? series.bands
          .map((band) => resolveStyleColor(band?.stroke ?? band?.fill))
          .filter(Boolean)
      : [];
    const topBandColor = bandColors.length
      ? bandColors[bandColors.length - 1]
      : null;

    return (
      medianColor ||
      topBandColor ||
      resolveStyleColor(fill) ||
      resolveStyleColor(stroke) ||
      'currentColor'
    );
  }
  if (type === 'boxPlot') {
    return hasFill ? fill : strokeWhisker || stroke || 'currentColor';
  }

  return hasFill ? fill : stroke || color || 'currentColor';
}

function getMarkerShape(seriesType) {
  switch (seriesType) {
    case 'line':
      return 'line';
    case 'circle':
      return 'circle';
    default:
      return 'rect';
  }
}

function formatLegendValue(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return '';

  const abs = Math.abs(numeric);
  if (abs >= 100) {
    return numeric.toLocaleString(undefined, { maximumFractionDigits: 1 });
  }
  if (abs >= 1) {
    return numeric.toLocaleString(undefined, { maximumFractionDigits: 2 });
  }

  return numeric.toLocaleString(undefined, {
    minimumSignificantDigits: 1,
    maximumSignificantDigits: 2,
  });
}

function buildMarkerLegendItem({ series, index, markerSize, legendFont }) {
  const label = getLegendLabel(series, index);
  const color = resolveLegendColor(series);
  const markerShape = getMarkerShape(series?.type);
  const labelDimensions = getTextDimensions(label, legendFont);

  return {
    id: String(series?.id ?? `legend-item-${index}`),
    kind: 'marker',
    label,
    color,
    markerShape,
    markerSize,
    width: Math.max(
      1,
      markerSize + LEGEND_MARKER_TEXT_GAP + labelDimensions.width,
    ),
    height: Math.max(1, Math.max(markerSize, labelDimensions.height)),
  };
}

function buildColorbarLegendItem({
  series,
  index,
  rootData,
  legendOptions,
  legendFont,
  tickFont,
}) {
  const type = series?.type;
  const defaults =
    type === 'matrix'
      ? defaultMatrixOptions
      : type === 'contourGrid'
        ? defaultContourGridOptions
        : defaultHeatmapOptions;
  const label = getLegendLabel(series, index);
  const colorsFromSeries = Array.isArray(series?.colors) ? series.colors : null;
  const colorsFromDefaults = Array.isArray(defaults?.colors)
    ? defaults.colors
    : [];
  const colors =
    colorsFromSeries && colorsFromSeries.length > 0
      ? colorsFromSeries
      : colorsFromDefaults;

  const fallbackFill =
    series?.fill ?? defaults?.fill ?? resolveLegendColor(series) ?? '#b8b8b8';
  const safeColors = colors.length > 0 ? colors : [fallbackFill];

  const valueKey = series?.valueKey ?? defaults?.valueKey;
  const getValue = createAccessor(valueKey);
  const seriesData = Array.isArray(series?.data) ? series.data : rootData;
  const values = seriesData
    .map((datum) => Number(getValue(datum)))
    .filter((value) => Number.isFinite(value));

  const thresholds = resolveThresholds(series?.thresholds, values, safeColors);
  const [valueMin, valueMax] = getNumericExtent(values);
  const thresholdMin = thresholds[0];
  const thresholdMax = thresholds[thresholds.length - 1];

  const minLabel = formatLegendValue(
    Number.isFinite(valueMin) ? valueMin : thresholdMin,
  );
  const maxLabel = formatLegendValue(
    Number.isFinite(valueMax) ? valueMax : thresholdMax,
  );

  const barWidth = toNonNegativeNumber(legendOptions?.colorbar?.width, 120);
  const barHeight = toNonNegativeNumber(legendOptions?.colorbar?.height, 10);
  const tickGap = toNonNegativeNumber(legendOptions?.colorbar?.tickGap, 4);

  const labelDimensions = label
    ? getTextDimensions(label, legendFont)
    : { width: 0, height: 0 };
  const minLabelDimensions = minLabel
    ? getTextDimensions(minLabel, tickFont)
    : { width: 0, height: 0 };
  const maxLabelDimensions = maxLabel
    ? getTextDimensions(maxLabel, tickFont)
    : { width: 0, height: 0 };

  const tickLabelWidth =
    minLabelDimensions.width +
    (minLabel && maxLabel ? LEGEND_COLORBAR_TICK_LABEL_GAP : 0) +
    maxLabelDimensions.width;

  const width = Math.max(
    1,
    Math.max(labelDimensions.width, barWidth, tickLabelWidth),
  );

  const tickLabelHeight = Math.max(
    minLabelDimensions.height,
    maxLabelDimensions.height,
  );
  const labelHeight = label
    ? labelDimensions.height + LEGEND_COLORBAR_LABEL_GAP
    : 0;
  const tickRowHeight = tickLabelHeight > 0 ? tickGap + tickLabelHeight : 0;
  const height = Math.max(1, labelHeight + barHeight + tickRowHeight);

  return {
    id: String(series?.id ?? `legend-item-${index}`),
    kind: 'colorbar',
    label,
    colors: safeColors,
    thresholds,
    minLabel,
    maxLabel,
    barWidth,
    barHeight,
    tickGap,
    labelTextHeight: label ? labelDimensions.height : 0,
    labelGap: label ? LEGEND_COLORBAR_LABEL_GAP : 0,
    tickLabelHeight,
    width,
    height,
  };
}

function layoutLegendRows(items, availableWidth, itemGap, rowGap) {
  const maxWidth = Math.max(0, toNonNegativeNumber(availableWidth, 0));
  const rows = [];
  let currentRow = { items: [], width: 0, height: 0 };

  items.forEach((item) => {
    const itemWidth = Math.max(1, toNonNegativeNumber(item.width, 0));
    const itemHeight = Math.max(1, toNonNegativeNumber(item.height, 0));

    const nextWidth =
      currentRow.items.length === 0
        ? itemWidth
        : currentRow.width + itemGap + itemWidth;
    const shouldWrap =
      maxWidth > 0 && currentRow.items.length > 0 && nextWidth > maxWidth;

    if (shouldWrap) {
      rows.push(currentRow);
      currentRow = { items: [], width: 0, height: 0 };
    }

    const x = currentRow.items.length === 0 ? 0 : currentRow.width + itemGap;

    currentRow.items.push({
      ...item,
      width: itemWidth,
      height: itemHeight,
      x,
      y: 0,
    });
    currentRow.width = x + itemWidth;
    currentRow.height = Math.max(currentRow.height, itemHeight);
  });

  if (currentRow.items.length > 0) {
    rows.push(currentRow);
  }

  const positionedItems = [];
  let yOffset = 0;

  rows.forEach((row, rowIndex) => {
    const rowOffsetX =
      maxWidth > 0 && row.width < maxWidth ? (maxWidth - row.width) / 2 : 0;

    row.items.forEach((item) => {
      positionedItems.push({
        ...item,
        rowIndex,
        x: item.x + rowOffsetX,
        y: yOffset + (row.height - item.height) / 2,
      });
    });

    yOffset += row.height + rowGap;
  });

  const totalHeight = rows.length > 0 ? Math.max(0, yOffset - rowGap) : 0;
  return { rows, items: positionedItems, totalHeight };
}

export function buildLegendLayout({ chartValues, axisLayout = {} }) {
  const options = chartValues.options || {};
  const series = options.series || [];
  const legendOptions = options.legend || {};
  const isEnabled = legendOptions.enabled !== false;

  if (!isEnabled || series.length === 0) {
    return {
      enabled: false,
      items: [],
      rows: [],
      height: 0,
      axisOffset: toNonNegativeNumber(axisLayout?.x?.requiredOutsideSpace, 0),
      gap: toNonNegativeNumber(legendOptions.gap, 10),
      requiredOutsideSpace: 0,
    };
  }

  const legendFont = toFontString(
    legendOptions.fontWeight,
    legendOptions.fontSize,
    legendOptions.fontFamily,
    'sans-serif',
  );
  const tickFont = toFontString(
    legendOptions?.colorbar?.tickFontWeight,
    legendOptions?.colorbar?.tickFontSize,
    legendOptions.fontFamily,
    'sans-serif',
  );
  const markerSize = toNonNegativeNumber(legendOptions.markerSize, 10);
  const rootData = Array.isArray(chartValues.data) ? chartValues.data : [];

  const rawItems = series
    .map((entry, index) => {
      if (!entry || entry.isVisible === false || entry.showInLegend === false) {
        return null;
      }

      if (
        entry.type === 'matrix' ||
        entry.type === 'heatmap' ||
        entry.type === 'contourGrid'
      ) {
        return buildColorbarLegendItem({
          series: entry,
          index,
          rootData,
          legendOptions,
          legendFont,
          tickFont,
        });
      }

      return buildMarkerLegendItem({
        series: entry,
        index,
        markerSize,
        legendFont,
      });
    })
    .filter(Boolean);

  if (rawItems.length === 0) {
    return {
      enabled: false,
      items: [],
      rows: [],
      height: 0,
      axisOffset: toNonNegativeNumber(axisLayout?.x?.requiredOutsideSpace, 0),
      gap: toNonNegativeNumber(legendOptions.gap, 10),
      requiredOutsideSpace: 0,
    };
  }

  const itemGap = toNonNegativeNumber(legendOptions.itemGap, 16);
  const rowGap = toNonNegativeNumber(legendOptions.rowGap, 8);
  const availableWidth = toNonNegativeNumber(chartValues.innerWidth, 0);
  const { rows, items, totalHeight } = layoutLegendRows(
    rawItems,
    availableWidth,
    itemGap,
    rowGap,
  );

  const axisOffset = toNonNegativeNumber(
    axisLayout?.x?.requiredOutsideSpace,
    0,
  );
  const gap = toNonNegativeNumber(legendOptions.gap, 10);
  const requiredOutsideSpace = gap + totalHeight + AXIS_MEASUREMENT_BUFFER;

  return {
    enabled: totalHeight > 0,
    items,
    rows: rows.map((row, index) => ({
      index,
      width: row.width,
      height: row.height,
    })),
    height: totalHeight,
    axisOffset,
    gap,
    requiredOutsideSpace: totalHeight > 0 ? requiredOutsideSpace : 0,
  };
}

export function buildAxisTicks({
  axisKey,
  axisOptions = {},
  scale,
  domain,
  chartValues,
}) {
  if (!scale) return [];

  const ticksOpts = axisOptions.ticks || {};
  const explicitTickValues = normalizeTickValues(ticksOpts.values);
  const explicitTickLabels = explicitTickValues
    ? normalizeTickLabels(ticksOpts.labels)
    : null;

  const tickAmount =
    Number.isFinite(ticksOpts.amount) && ticksOpts.amount > 0
      ? ticksOpts.amount
      : null;
  const isBandScale = typeof scale?.bandwidth === 'function';
  const dataAlignedTickValues =
    !explicitTickValues &&
    isXValueAxis(axisKey) &&
    (axisOptions.type === 'time' || axisOptions.type === 'linear')
      ? getDataAlignedXTickValues(chartValues, axisKey)
      : [];

  const generatedTickValues = isBandScale
    ? domain || []
    : dataAlignedTickValues.length > 0
      ? dataAlignedTickValues
      : typeof scale?.ticks === 'function'
        ? tickAmount != null
          ? scale.ticks(tickAmount)
          : scale.ticks()
        : [];

  const tickValues = explicitTickValues || generatedTickValues;
  const defaultFormatter =
    !explicitTickValues &&
    dataAlignedTickValues.length === 0 &&
    typeof scale.tickFormat === 'function'
      ? scale.tickFormat(tickAmount ?? 10)
      : String;
  const tickFormatter =
    typeof ticksOpts.formatter === 'function'
      ? ticksOpts.formatter
      : defaultFormatter;
  const resolvedDomain = domain || scale.domain();
  const domainBounds = resolvedDomain.map(toComparable);
  const domainMin = Math.min(...domainBounds);
  const domainMax = Math.max(...domainBounds);
  const seen = new Set();

  return tickValues
    .map((value, index) => ({
      value,
      label: explicitTickLabels?.[index],
    }))
    .filter((tick) => {
      if (tick.value == null) return false;
      if (!Number.isFinite(getAxisTickPosition(scale, tick.value)))
        return false;
      if (!isBandScale) {
        const comparable = toComparable(tick.value);
        if (
          !Number.isFinite(comparable) ||
          comparable < domainMin ||
          comparable > domainMax
        ) {
          return false;
        }
      }

      const key = getTickValueKey(tick.value);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map((tick) => ({
      value: tick.value,
      label: String(tick.label ?? tickFormatter(tick.value) ?? ''),
    }));
}

export function normalizeMarginInput(margin = {}) {
  const normalizeValue = (value) => {
    if (typeof value === 'string' && value.trim().toLowerCase() === 'auto') {
      return DEFAULT_AUTO_MARGIN;
    }

    if (Number.isFinite(value)) {
      return Math.max(0, value);
    }

    return DEFAULT_AUTO_MARGIN;
  };

  return {
    top: normalizeValue(margin?.top),
    right: normalizeValue(margin?.right),
    bottom: normalizeValue(margin?.bottom),
    left: normalizeValue(margin?.left),
  };
}

export function getProvisionalNumericMargin(baseMargin) {
  const margin = normalizeMarginInput(baseMargin);

  return {
    top: typeof margin.top === 'number' ? margin.top : 0,
    right: typeof margin.right === 'number' ? margin.right : 0,
    bottom: typeof margin.bottom === 'number' ? margin.bottom : 0,
    left: typeof margin.left === 'number' ? margin.left : 0,
  };
}

export function resolveMargin(baseMargin, autoMargin) {
  const margin = normalizeMarginInput(baseMargin);

  return {
    top:
      typeof margin.top === 'number'
        ? margin.top
        : toNonNegativeNumber(autoMargin?.top, 0),
    right:
      typeof margin.right === 'number'
        ? margin.right
        : toNonNegativeNumber(autoMargin?.right, 0),
    bottom:
      typeof margin.bottom === 'number'
        ? margin.bottom
        : toNonNegativeNumber(autoMargin?.bottom, 0),
    left:
      typeof margin.left === 'number'
        ? margin.left
        : toNonNegativeNumber(autoMargin?.left, 0),
  };
}

export function getPlotBoundsFromChartValues(chartValues = {}) {
  const margin = chartValues.margin || {
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  };

  const left = toNumber(margin.left, 0);
  const top = toNumber(margin.top, 0);
  const width = toNonNegativeNumber(chartValues.innerWidth, 0);
  const height = toNonNegativeNumber(chartValues.innerHeight, 0);

  return {
    left,
    right: left + width,
    top,
    bottom: top + height,
    width,
    height,
  };
}

export function buildAxisLayout({ chartValues, computedScales = {} }) {
  const axisConfig = chartValues.options?.axes || {};
  const series = chartValues.options?.series || [];

  const axisLayout = {};

  AXIS_KEYS.forEach((axisKey) => {
    const axisOptions = axisConfig[axisKey];
    if (!axisOptions || !axisHasMappedSeries(series, axisKey)) return;

    const scaleBundle = computedScales[axisKey];
    const axisScale = scaleBundle?.scale;
    if (!axisScale) return;

    const axisDomain =
      scaleBundle?.domain ||
      (typeof axisScale.domain === 'function' ? axisScale.domain() : []);

    const ticksOpts = axisOptions.ticks || {};
    const initialTicks = buildAxisTicks({
      axisKey,
      axisOptions,
      scale: axisScale,
      domain: axisDomain,
      chartValues,
    });

    const isXAxis = isXValueAxis(axisKey);
    const isSecondaryAxis = axisKey === 'x2' || axisKey === 'y2';
    const side = getSideForAxis(axisKey);

    const hasAxisLine = Boolean(axisOptions.hasAxisLine);
    const strokeWidth = toNonNegativeNumber(axisOptions.strokeWidth, 1);
    const axisStrokeOutside = hasAxisLine ? strokeWidth / 2 : 0;

    const tickFont = toFontString(
      ticksOpts.fontWeight,
      ticksOpts.fontSize,
      ticksOpts.fontFamily,
      'sans-serif',
    );

    const tickAngle =
      Number.isFinite(ticksOpts.angle) && Math.abs(ticksOpts.angle) <= 90
        ? ticksOpts.angle
        : 0;
    const collisionMinGap = toNonNegativeNumber(
      ticksOpts.collisionMinGap,
      DEFAULT_TICK_COLLISION_MIN_GAP,
    );
    const ticks = resolveAxisTickLabels({
      axisKey,
      axisScale,
      ticks: initialTicks,
      tickFont,
      angle: tickAngle,
      reduceLabels: ticksOpts.reduceLabels !== false,
      minGap: collisionMinGap,
    });

    const configuredTickLength = toNumber(ticksOpts.length, 5);
    const tickLength = hasAxisLine ? configuredTickLength : 0;
    const outwardTickLength = ticks.length > 0 ? Math.max(0, tickLength) : 0;
    const visibleLabels = ticks.filter((tick) => tick.showLabel);
    const tickLabelPadding =
      visibleLabels.length > 0
        ? toNonNegativeNumber(ticksOpts.labelPadding, 5)
        : 0;
    const tickTextOutsideSize = Math.max(
      0,
      ...visibleLabels.map((tick) => {
        const bounds = tick.labelGeometry.bounds;
        return isXAxis
          ? isSecondaryAxis
            ? -bounds.top
            : bounds.bottom
          : isSecondaryAxis
            ? bounds.right
            : -bounds.left;
      }),
    );

    const axisLabelText = getAxisLabelText(axisOptions);
    const axisLabelFont = toFontString(
      axisOptions.label?.fontWeight,
      axisOptions.label?.fontSize,
      axisOptions.label?.fontFamily,
      'sans-serif',
    );
    const axisLabelDimensions = axisLabelText
      ? getTextDimensions(axisLabelText, axisLabelFont, isXAxis ? 0 : -90)
      : { width: 0, height: 0 };
    const axisLabelOutsideSize = axisLabelText
      ? isXAxis
        ? axisLabelDimensions.height
        : axisLabelDimensions.width
      : 0;
    const axisLabelGap = axisLabelText ? AXIS_LABEL_GAP : 0;

    const tickDirection = isXAxis
      ? isSecondaryAxis
        ? -1
        : 1
      : isSecondaryAxis
        ? 1
        : -1;

    const axisLabelOffset =
      outwardTickLength + tickLabelPadding + tickTextOutsideSize + axisLabelGap;
    const axisLabelCenterOffset =
      axisLabelOffset + (isXAxis ? 0 : axisLabelOutsideSize / 2);

    const edgeOverflow = getAxisEdgeOverflow({
      axisKey,
      axisScale,
      ticks,
      axisLabelText,
      axisLabelDimensions,
      chartWidth: chartValues.width,
      chartHeight: chartValues.height,
    });

    const requiredOutsideSpace =
      axisStrokeOutside +
      outwardTickLength +
      tickLabelPadding +
      tickTextOutsideSize +
      axisLabelGap +
      axisLabelOutsideSize +
      AXIS_MEASUREMENT_BUFFER;

    axisLayout[axisKey] = {
      axisKey,
      isXAxis,
      isSecondaryAxis,
      side,
      ticks,
      tickAngle,
      hasAxisLine,
      hasGridLines: Boolean(axisOptions.hasGridLines),
      strokeAxis: axisOptions.strokeAxis,
      strokeGrid: axisOptions.strokeGrid,
      strokeWidth,
      tickLength,
      tickDirection,
      tickLabelPadding,
      tickFontFamily: ticksOpts.fontFamily,
      tickFontSize: ticksOpts.fontSize,
      tickFontWeight: ticksOpts.fontWeight,
      tickFontColor: ticksOpts.fontColor,
      tickTextOutsideSize,
      axisLabel: {
        text: axisLabelText,
        fontFamily: axisOptions.label?.fontFamily,
        fontSize: axisOptions.label?.fontSize,
        fontWeight: axisOptions.label?.fontWeight,
        fontColor: axisOptions.label?.fontColor,
        outsideSize: axisLabelOutsideSize,
      },
      axisLabelOffset,
      axisLabelCenterOffset,
      edgeOverflow,
      requiredOutsideSpace,
    };
  });

  return axisLayout;
}

export function getAutoMarginFromAxisLayout(
  axisLayout = {},
  legendLayout = {},
) {
  const legendBottom = toNonNegativeNumber(
    legendLayout?.requiredOutsideSpace,
    0,
  );

  const baseMargin = {
    top: toNonNegativeNumber(axisLayout.x2?.requiredOutsideSpace, 0),
    right: toNonNegativeNumber(axisLayout.y2?.requiredOutsideSpace, 0),
    bottom:
      toNonNegativeNumber(axisLayout.x?.requiredOutsideSpace, 0) + legendBottom,
    left: toNonNegativeNumber(axisLayout.y?.requiredOutsideSpace, 0),
  };

  const edgeOverflow = { top: 0, right: 0, bottom: 0, left: 0 };
  Object.values(axisLayout).forEach((layout) => {
    if (!layout?.edgeOverflow) return;

    edgeOverflow.top = Math.max(
      edgeOverflow.top,
      toNonNegativeNumber(layout.edgeOverflow.top, 0),
    );
    edgeOverflow.right = Math.max(
      edgeOverflow.right,
      toNonNegativeNumber(layout.edgeOverflow.right, 0),
    );
    edgeOverflow.bottom = Math.max(
      edgeOverflow.bottom,
      toNonNegativeNumber(layout.edgeOverflow.bottom, 0),
    );
    edgeOverflow.left = Math.max(
      edgeOverflow.left,
      toNonNegativeNumber(layout.edgeOverflow.left, 0),
    );
  });

  return {
    top: Math.ceil(Math.max(baseMargin.top, edgeOverflow.top)),
    right: Math.ceil(Math.max(baseMargin.right, edgeOverflow.right)),
    bottom: Math.ceil(Math.max(baseMargin.bottom, edgeOverflow.bottom)),
    left: Math.ceil(Math.max(baseMargin.left, edgeOverflow.left)),
  };
}

/**
 * Measures the dimensions of a given text string using a canvas context.
 *
 * @param {string} text - The text to measure.
 * @param {string} font - The CSS font property string, e.g. '400 16px Open Sans'.
 *   Should be in the format: '[font-weight] [font-size] [font-family]'.
 *   Font weight can be omitted, a number (e.g., 400, 700) or a keyword (e.g., 'bold').
 * @param {number} [rotate=0] - Degrees to rotate the text before measuring (not commonly used).
 * @returns {TextMetrics} The TextMetrics object containing width and other properties.
 *
 * @example
 * const metrics = getTextDimensions('Legend', '700 14px Arial');
 * console.log(metrics.width);
 */
export function getTextDimensions(text, font, rotate = 0) {
  const resolvedFont = normalizeCanvasFontString(font, 'sans-serif');

  if (!context) {
    const numericSize = toNonNegativeNumber(
      resolvedFont.match(/(\d+(?:\.\d+)?)px/)?.[1],
      12,
    );
    const width = String(text ?? '').length * numericSize * 0.6;
    const height = numericSize;
    const radians = (rotate * Math.PI) / 180;
    const rotatedWidth =
      Math.abs(width * Math.cos(radians)) +
      Math.abs(height * Math.sin(radians));
    const rotatedHeight =
      Math.abs(width * Math.sin(radians)) +
      Math.abs(height * Math.cos(radians));
    return { width: rotatedWidth, height: rotatedHeight };
  }

  context.save();
  context.font = resolvedFont;
  const metrics = context.measureText(text);
  const { width } = metrics;
  const height =
    metrics.fontBoundingBoxAscent + metrics.fontBoundingBoxDescent ||
    metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent ||
    toNonNegativeNumber(resolvedFont.match(/(\d+(?:\.\d+)?)px/)?.[1], 12);
  // now we need to calculate the rotated width and height
  const radians = (rotate * Math.PI) / 180;
  const rotatedWidth =
    Math.abs(width * Math.cos(radians)) + Math.abs(height * Math.sin(radians));
  const rotatedHeight =
    Math.abs(width * Math.sin(radians)) + Math.abs(height * Math.cos(radians));
  context.restore();
  return { width: rotatedWidth, height: rotatedHeight };
}

// takes in an array of labels with a name property and a font, '700 14px Arial'
export function getMaxTextDimensions(textArray, font, rotate = 0) {
  // variable to store the maximum label width
  let maxLabelWidth = 0;
  let maxLabelHeight = 0;

  // Iterate over all the labels to find the maximum width
  textArray.forEach((item) => {
    const { width: labelWidth, height: labelHeight } = getTextDimensions(
      item,
      font,
      rotate,
    );
    if (labelWidth > maxLabelWidth) {
      maxLabelWidth = Math.ceil(labelWidth);
    }
    if (labelHeight > maxLabelHeight) {
      maxLabelHeight = Math.ceil(labelHeight);
    }
  });

  return { width: maxLabelWidth, height: maxLabelHeight };
}

export function getTransformProps(
  isHorizontal,
  anchorPoint,
  tickLength,
  tickAngle = 0,
) {
  // guard against string input
  const tickAngleNumber = Number(tickAngle);
  const isNegativeTick = tickLength < 0;

  let transform = '';
  let textAnchor = '';
  let dominantBaseline = '';

  if (isHorizontal) {
    if (tickAngleNumber > 0) {
      textAnchor = isNegativeTick ? 'end' : 'start';
      dominantBaseline = 'middle';
      transform = `rotate(${tickAngleNumber}, 0, ${anchorPoint})`;
    } else if (tickAngleNumber < 0) {
      textAnchor = isNegativeTick ? 'start' : 'end';
      dominantBaseline = 'middle';
      transform = `rotate(${tickAngleNumber}, 0, ${anchorPoint})`;
    } else {
      // tickAngleNumber === 0
      textAnchor = 'middle';
      dominantBaseline = isNegativeTick ? 'alphabetic' : 'hanging';
    }
  } else if (!isHorizontal) {
    if (tickAngleNumber === 90) {
      textAnchor = 'middle';
      dominantBaseline = isNegativeTick ? 'hanging' : 'alphabetic';
      transform = `rotate(90, ${anchorPoint}, 0)`;
    } else if (tickAngleNumber === -90) {
      textAnchor = 'middle';
      dominantBaseline = isNegativeTick ? 'alphabetic' : 'hanging';
      transform = `rotate(-90, ${anchorPoint}, 0)`;
    } else if (tickAngleNumber !== 0) {
      textAnchor = isNegativeTick ? 'end' : 'start';
      dominantBaseline = 'middle';
      transform = `rotate(${tickAngleNumber}, ${anchorPoint}, 0)`;
    } else {
      // tickAngleNumber === 0
      textAnchor = isNegativeTick ? 'end' : 'start';
      dominantBaseline = 'middle';
    }
  }
  return { transform, textAnchor, dominantBaseline };
}

export function getTitleProps({
  isHorizontal,
  titleJustify,
  titleDimensions,
  barLength,
}) {
  let transform = '';
  let textAnchor = '';
  let dominantBaseline = '';
  let x = 0;
  let y = 0;

  if (isHorizontal) {
    if (titleJustify === 'left') {
      x = 0;
      textAnchor = 'start';
    } else if (titleJustify === 'center') {
      x = barLength / 2;
      textAnchor = 'middle';
    } else if (titleJustify === 'right') {
      x = barLength;
      textAnchor = 'end';
    }
    y = titleDimensions.height / 2;
    dominantBaseline = 'central';
  } else if (!isHorizontal) {
    if (titleJustify === 'left') {
      y = barLength;
      textAnchor = 'start';
    } else if (titleJustify === 'center') {
      y = barLength / 2;
      textAnchor = 'middle';
    } else if (titleJustify === 'right') {
      y = 0;
      textAnchor = 'end';
    }
    x = titleDimensions.width / 2;
    dominantBaseline = 'central';
    transform = `rotate(-90, ${x}, ${y})`;
  }

  return { transform, textAnchor, dominantBaseline, x, y };
}
