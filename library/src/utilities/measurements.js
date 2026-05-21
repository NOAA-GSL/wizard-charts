import {
  axisHasMappedSeries,
  createAccessor,
  getSeriesForAxis,
  isXValueAxis,
} from './dataUtilities';
import { defaultHeatmapOptions, defaultMatrixOptions } from './defaultOptions';
import { toComparable } from './valueUtilities';

const AXIS_KEYS = ['x', 'x2', 'y', 'y2'];
const DEFAULT_AUTO_MARGIN = 'auto';
const AXIS_LABEL_GAP = 6;
const AXIS_MEASUREMENT_BUFFER = 2;
const LEGEND_MARKER_TEXT_GAP = 6;
const LEGEND_COLORBAR_LABEL_GAP = 4;
const LEGEND_COLORBAR_TICK_LABEL_GAP = 12;

// setting up canvas outside of function to prevent repeated creation
const canvas =
  typeof document !== 'undefined' ? document.createElement('canvas') : null;
const context = canvas ? canvas.getContext('2d') : null;

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

function getAxisLabelText(axisOptions = {}) {
  const text = axisOptions.label?.text;
  return text == null ? '' : String(text);
}

function getTextAnchorHorizontalExtents(textAnchor, width) {
  if (textAnchor === 'end') {
    return { left: width, right: 0 };
  }

  if (textAnchor === 'start') {
    return { left: 0, right: width };
  }

  return { left: width / 2, right: width / 2 };
}

function getAxisEdgeOverflow({
  axisKey,
  axisScale,
  ticks,
  tickFont,
  tickAngle,
  isAngledTicks,
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
  const isBandScale = typeof axisScale.bandwidth === 'function';

  const getTickPosition = (value) => {
    const basePosition = axisScale(value);
    if (!Number.isFinite(basePosition)) return null;

    if (isBandScale) {
      return basePosition + axisScale.bandwidth() / 2;
    }

    return basePosition;
  };

  ticks.forEach((tick) => {
    const tickPosition = getTickPosition(tick.value);
    if (!Number.isFinite(tickPosition)) return;

    const labelText = String(tick.label ?? '');
    const labelDimensions = getTextDimensions(
      labelText,
      tickFont,
      isXAxis ? tickAngle : 0,
    );

    if (isXAxis) {
      const textAnchor = isAngledTicks ? 'end' : 'middle';
      const { left, right } = getTextAnchorHorizontalExtents(
        textAnchor,
        labelDimensions.width,
      );

      const labelLeft = tickPosition - left;
      const labelRight = tickPosition + right;

      overflow.left = Math.max(overflow.left, Math.max(0, -labelLeft));
      overflow.right = Math.max(
        overflow.right,
        Math.max(0, labelRight - chartWidth),
      );

      return;
    }

    const halfLabelHeight = labelDimensions.height / 2;
    const labelTop = tickPosition - halfLabelHeight;
    const labelBottom = tickPosition + halfLabelHeight;

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

function getTickValueKey(value) {
  return value instanceof Date ? `d:${value.getTime()}` : `v:${String(value)}`;
}

const DATA_ALIGNED_X_TICK_SERIES_TYPES = new Set([
  'area',
  'bar',
  'boxPlot',
  'circle',
  'line',
  'matrix',
]);

function sampleTickValues(values, tickAmount) {
  if (!Array.isArray(values) || values.length === 0) return [];

  const targetCount =
    Number.isFinite(tickAmount) && tickAmount > 0
      ? Math.floor(tickAmount)
      : values.length;

  if (values.length <= targetCount) return values;
  if (targetCount <= 1) return [values[0]];

  // Use a fixed stride so consecutive tick gaps remain consistent.
  const stride = Math.max(
    1,
    Math.floor((values.length - 1) / (targetCount - 1)),
  );
  const sampled = [];

  for (let i = 0; i < values.length; i += stride) {
    sampled.push(values[i]);
    if (sampled.length === targetCount) break;
  }

  return sampled;
}

function getDataAlignedXTickValues(chartValues, axisKey, tickAmount) {
  if (!isXValueAxis(axisKey)) return [];

  const series = chartValues.options?.series || [];
  const rootData = Array.isArray(chartValues.data) ? chartValues.data : [];
  const matchingSeries = getSeriesForAxis(series, axisKey);
  const alignedSeries = matchingSeries.filter((seriesEntry) =>
    DATA_ALIGNED_X_TICK_SERIES_TYPES.has(seriesEntry?.type),
  );

  if (alignedSeries.length === 0) return [];

  const hasOnlyMatrixSeries =
    matchingSeries.length === alignedSeries.length &&
    alignedSeries.every((seriesEntry) => seriesEntry?.type === 'matrix');

  const tickValues = [];
  const seen = new Set();

  alignedSeries.forEach((s) => {
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

  // Matrix time/linear axes should keep every unique x value.
  if (hasOnlyMatrixSeries) return sortedTickValues;

  return sampleTickValues(sortedTickValues, tickAmount);
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
  const type = series?.type;
  const hasFill = typeof fill === 'string' && fill !== 'none';

  if (type === 'line') return stroke || fill || 'currentColor';
  if (type === 'circle') return fill || stroke || 'currentColor';
  if (type === 'area') {
    return hasFill ? fill : stroke || strokeWhisker || 'currentColor';
  }
  if (type === 'boxPlot') {
    return hasFill ? fill : strokeWhisker || stroke || 'currentColor';
  }

  return hasFill ? fill : stroke || 'currentColor';
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

function normalizeLegendThresholds(thresholds) {
  if (!Array.isArray(thresholds)) return [];

  const sorted = thresholds
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value))
    .sort((a, b) => a - b);

  return sorted.filter(
    (value, index) => index === 0 || value !== sorted[index - 1],
  );
}

function getNumericExtent(values) {
  if (!Array.isArray(values) || values.length === 0) return [null, null];

  let min = Infinity;
  let max = -Infinity;

  values.forEach((value) => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return;
    if (numeric < min) min = numeric;
    if (numeric > max) max = numeric;
  });

  if (!Number.isFinite(min) || !Number.isFinite(max)) return [null, null];
  return [min, max];
}

function resolveLegendThresholds(inputThresholds, values, colors) {
  const normalized = normalizeLegendThresholds(inputThresholds);
  if (normalized.length > 0) return normalized;

  const colorCount = Array.isArray(colors) ? colors.length : 0;
  const thresholdCount = Math.max(0, colorCount - 1);
  if (thresholdCount === 0) return [];

  const [min, max] = getNumericExtent(values);
  if (!Number.isFinite(min) || !Number.isFinite(max)) return [];
  if (max <= min) return [min];

  const step = (max - min) / colorCount;
  return Array.from(
    { length: thresholdCount },
    (_, index) => min + step * (index + 1),
  );
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
    type === 'matrix' ? defaultMatrixOptions : defaultHeatmapOptions;
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

  const thresholds = resolveLegendThresholds(
    series?.thresholds,
    values,
    safeColors,
  );
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

      if (entry.type === 'matrix' || entry.type === 'heatmap') {
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
  const explicitTickLabels = normalizeTickLabels(ticksOpts.labels);

  const tickAmount =
    Number.isFinite(ticksOpts.amount) && ticksOpts.amount > 0
      ? ticksOpts.amount
      : null;
  const tickFormatter = ticksOpts.formatter;
  const fallbackEmptyLabelToValue = !isXValueAxis(axisKey);

  const isBandScale = typeof scale?.bandwidth === 'function';
  const dataAlignedTickValues =
    !explicitTickValues &&
    isXValueAxis(axisKey) &&
    (axisOptions.type === 'time' || axisOptions.type === 'linear')
      ? getDataAlignedXTickValues(chartValues, axisKey, tickAmount)
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

  return tickValues.map((value, index) => {
    const rawLabel =
      explicitTickLabels?.[index] ??
      (tickFormatter ? tickFormatter(value) : String(value));

    const displayLabel =
      fallbackEmptyLabelToValue && rawLabel === '' ? String(value) : rawLabel;

    return {
      value,
      label: displayLabel,
    };
  });
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
    const ticks = buildAxisTicks({
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

    const configuredTickLength = toNumber(ticksOpts.length, 5);
    const tickLength = hasAxisLine ? configuredTickLength : 0;
    const outwardTickLength = ticks.length > 0 ? Math.max(0, tickLength) : 0;
    const tickLabelPadding =
      ticks.length > 0 ? toNonNegativeNumber(ticksOpts.labelPadding, 5) : 0;

    const tickFont = toFontString(
      ticksOpts.fontWeight,
      ticksOpts.fontSize,
      ticksOpts.fontFamily,
      'sans-serif',
    );

    const isAngledTicks = isXAxis && Boolean(ticksOpts.isAngled);
    const tickAngle = isAngledTicks ? -45 : 0;
    const tickLabels = ticks.map((tick) => String(tick.label ?? ''));
    const tickDimensions = getMaxTextDimensions(
      tickLabels,
      tickFont,
      tickAngle,
    );
    const tickTextOutsideSize =
      ticks.length > 0
        ? isXAxis
          ? tickDimensions.height
          : tickDimensions.width
        : 0;

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
      tickFont,
      tickAngle,
      isAngledTicks,
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
      isAngledTicks,
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
  if (!context) {
    const numericSize = toNonNegativeNumber(
      String(font).match(/(\d+(?:\.\d+)?)px/)?.[1],
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
  context.font = font;
  const metrics = context.measureText(text);
  const { width } = metrics;
  const height =
    metrics.fontBoundingBoxAscent + metrics.fontBoundingBoxDescent ||
    metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent ||
    toNonNegativeNumber(String(font).match(/(\d+(?:\.\d+)?)px/)?.[1], 12);
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
