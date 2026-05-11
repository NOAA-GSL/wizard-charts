import {
  axisHasMappedSeries,
  createAccessor,
  getSeriesForAxis,
  isXValueAxis,
} from './dataUtilities';

const AXIS_KEYS = ['x', 'x2', 'y', 'y2'];
const DEFAULT_AUTO_MARGIN = 'auto';
const AXIS_LABEL_GAP = 6;
const AXIS_MEASUREMENT_BUFFER = 2;

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

function getMatrixTickValues(chartValues, axisKey) {
  if (!isXValueAxis(axisKey)) return [];

  const series = chartValues.options?.series || [];
  const rootData = Array.isArray(chartValues.data) ? chartValues.data : [];
  const matchingSeries = getSeriesForAxis(series, axisKey);
  const matrixSeries = matchingSeries.filter((s) => s?.type === 'matrix');

  const matrixTickValues = [];
  const seen = new Set();

  matrixSeries.forEach((s) => {
    const getX = createAccessor(s.xKey);
    const seriesData = Array.isArray(s?.data) ? s.data : rootData;

    seriesData.forEach((d) => {
      const v = getX(d);
      if (v == null) return;

      const key = v instanceof Date ? `d:${v.getTime()}` : `v:${String(v)}`;
      if (seen.has(key)) return;

      seen.add(key);
      matrixTickValues.push(v);
    });
  });

  return matrixTickValues;
}

function normalizeTickValues(values) {
  return Array.isArray(values) && values.length > 0 ? values : null;
}

function normalizeTickLabels(labels) {
  return Array.isArray(labels) && labels.length > 0 ? labels : null;
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
  const matrixTickValues =
    !explicitTickValues &&
    isXValueAxis(axisKey) &&
    (axisOptions.type === 'time' || axisOptions.type === 'linear')
      ? getMatrixTickValues(chartValues, axisKey)
      : [];

  const generatedTickValues = isBandScale
    ? domain || []
    : matrixTickValues.length > 0
      ? matrixTickValues
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

export function getAutoMarginFromAxisLayout(axisLayout = {}) {
  const baseMargin = {
    top: toNonNegativeNumber(axisLayout.x2?.requiredOutsideSpace, 0),
    right: toNonNegativeNumber(axisLayout.y2?.requiredOutsideSpace, 0),
    bottom: toNonNegativeNumber(axisLayout.x?.requiredOutsideSpace, 0),
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
    top: Math.ceil(baseMargin.top + edgeOverflow.top),
    right: Math.ceil(baseMargin.right + edgeOverflow.right),
    bottom: Math.ceil(baseMargin.bottom + edgeOverflow.bottom),
    left: Math.ceil(baseMargin.left + edgeOverflow.left),
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
