import { useRef } from 'react';
import useAnimation from '../hooks/useAnimation';
import { useChartHelpers } from '../hooks/useChartHelpers';
import { defaultLineMarkerOptions } from '../utilities/defaultOptions';

const VALID_PLACEMENTS = new Set([
  'top-left',
  'top-right',
  'bottom-left',
  'bottom-right',
]);

const textMeasureCanvas =
  typeof document !== 'undefined' ? document.createElement('canvas') : null;
const textMeasureContext = textMeasureCanvas
  ? textMeasureCanvas.getContext('2d')
  : null;

function clamp(value, min, max) {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, value));
}

function toPadding(value, fallback = 8) {
  if (Number.isFinite(Number(value))) {
    const numeric = Math.max(0, Number(value));
    return { edge: numeric, line: numeric };
  }

  if (value && typeof value === 'object') {
    const edge = Number.isFinite(Number(value.edge))
      ? Math.max(0, Number(value.edge))
      : fallback;
    const line = Number.isFinite(Number(value.line))
      ? Math.max(0, Number(value.line))
      : fallback;
    return { edge, line };
  }

  return { edge: fallback, line: fallback };
}

function getMarkerPosition(scale, value) {
  if (!scale) return null;

  const base = scale(value);
  if (!Number.isFinite(base)) return null;

  if (typeof scale.bandwidth === 'function') {
    return base + scale.bandwidth() / 2;
  }

  return base;
}

function isValueInsideDomain(scale, value) {
  if (!scale) return false;

  const domain = typeof scale.domain === 'function' ? scale.domain() : null;
  if (!Array.isArray(domain) || domain.length === 0) return false;

  if (typeof scale.bandwidth === 'function') {
    return domain.includes(value);
  }

  const domainStart =
    domain[0] instanceof Date ? domain[0].getTime() : Number(domain[0]);
  const domainEnd =
    domain[1] instanceof Date ? domain[1].getTime() : Number(domain[1]);
  const valueComparable =
    value instanceof Date ? value.getTime() : Number(value);

  if (
    !Number.isFinite(domainStart) ||
    !Number.isFinite(domainEnd) ||
    !Number.isFinite(valueComparable)
  ) {
    return false;
  }

  const minDomain = Math.min(domainStart, domainEnd);
  const maxDomain = Math.max(domainStart, domainEnd);
  return valueComparable >= minDomain && valueComparable <= maxDomain;
}

function normalizePlacement(value) {
  if (typeof value !== 'string') return 'top-right';
  const placement = value.trim().toLowerCase();
  return VALID_PLACEMENTS.has(placement) ? placement : 'top-right';
}

function getLabelText(marker) {
  const labelValue = marker?.label;
  if (typeof labelValue === 'string') return labelValue;
  if (labelValue == null) return '';
  return String(labelValue);
}

function getLabelPadding(value, fallback = 4) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? Math.max(0, numeric) : fallback;
}

function getLabelMetrics(text, marker) {
  const labelFontSize = Number(marker.fontSize);
  const safeFontSize = Number.isFinite(labelFontSize) ? labelFontSize : 12;
  const labelPadding = getLabelPadding(marker.labelPadding, 4);
  const safeFontWeight = marker.fontWeight ?? 700;
  const safeFontFamily = marker.fontFamily || 'sans-serif';

  let estimatedWidth = Math.max(0, text.length * safeFontSize * 0.6);
  let estimatedHeight = safeFontSize;

  if (textMeasureContext) {
    textMeasureContext.font = `${safeFontWeight} ${safeFontSize}px ${safeFontFamily}`;
    const metrics = textMeasureContext.measureText(text);

    if (Number.isFinite(metrics.width)) {
      estimatedWidth = Math.max(0, metrics.width);
    }

    const ascent = Number(metrics.actualBoundingBoxAscent);
    const descent = Number(metrics.actualBoundingBoxDescent);
    if (Number.isFinite(ascent) && Number.isFinite(descent)) {
      estimatedHeight = Math.max(0, ascent + descent);
    }
  }

  return {
    width: estimatedWidth + labelPadding * 2,
    height: estimatedHeight + labelPadding * 2,
    labelPadding,
  };
}

function LineMarker({ axisKey = 'y', options = {} }) {
  const markerGroupRef = useRef(null);
  const { chartValues, computedScales } = useChartHelpers();

  useAnimation({
    type: 'fadeIn',
    ref: markerGroupRef,
    trigger: chartValues.data,
  });

  const axisScale = computedScales?.[axisKey]?.scale;
  const isVertical = axisKey === 'x' || axisKey === 'x2';

  const plotLeft = chartValues.margin.left;
  const plotTop = chartValues.margin.top;
  const plotRight = chartValues.margin.left + chartValues.innerWidth;
  const plotBottom = chartValues.margin.top + chartValues.innerHeight;

  const lineMarkers = Array.isArray(options?.lineMarkers)
    ? options.lineMarkers
    : [];

  const renderedMarkers = lineMarkers
    .map((rawMarker, index) => {
      const marker = { ...defaultLineMarkerOptions, ...(rawMarker || {}) };
      if (!marker.isVisible || marker.value == null) return null;

      if (!isValueInsideDomain(axisScale, marker.value)) {
        return null;
      }

      const markerPosition = getMarkerPosition(axisScale, marker.value);
      if (!Number.isFinite(markerPosition)) return null;

      const labelText = getLabelText(marker).trim();
      const hasLabel = labelText.length > 0;
      const placement = normalizePlacement(marker.placement);
      const padding = toPadding(
        marker.padding,
        defaultLineMarkerOptions.padding,
      );

      const hasLeftPlacement = placement.endsWith('left');
      const hasTopPlacement = placement.startsWith('top');

      const metricKey = marker.id ?? `${axisKey}-line-marker-${index}`;
      const resolvedLabelMetrics = hasLabel
        ? getLabelMetrics(labelText, marker)
        : null;
      const labelBoxWidth = resolvedLabelMetrics?.width ?? 0;
      const labelBoxHeight = resolvedLabelMetrics?.height ?? 0;

      let labelBoxX = markerPosition;
      let labelBoxY = markerPosition;

      if (isVertical) {
        labelBoxX = hasLeftPlacement
          ? markerPosition - padding.line - labelBoxWidth
          : markerPosition + padding.line;
        labelBoxY = hasTopPlacement
          ? plotTop + padding.edge
          : plotBottom - padding.edge - labelBoxHeight;
      } else {
        labelBoxX = hasLeftPlacement
          ? plotLeft + padding.edge
          : plotRight - padding.edge - labelBoxWidth;
        labelBoxY = hasTopPlacement
          ? markerPosition - padding.line - labelBoxHeight
          : markerPosition + padding.line;
      }

      const clampedLabelBoxX = clamp(
        labelBoxX,
        plotLeft + padding.edge,
        plotRight - padding.edge - labelBoxWidth,
      );
      const clampedLabelBoxY = clamp(
        labelBoxY,
        plotTop + padding.edge,
        plotBottom - padding.edge - labelBoxHeight,
      );

      const labelTextX = clampedLabelBoxX + labelBoxWidth / 2;
      const labelTextY = clampedLabelBoxY + labelBoxHeight / 2;

      const resolvedLabelFill =
        typeof marker.labelBackgroundFill === 'string' &&
        marker.labelBackgroundFill.trim().length > 0
          ? marker.labelBackgroundFill
          : 'none';
      const resolvedLabelStroke =
        typeof marker.labelBackgroundStroke === 'string' &&
        marker.labelBackgroundStroke.trim().length > 0
          ? marker.labelBackgroundStroke
          : 'none';

      return {
        key: metricKey,
        marker,
        markerPosition,
        hasLabel,
        labelText,
        clampedLabelBoxX,
        clampedLabelBoxY,
        labelBoxWidth,
        labelBoxHeight,
        labelTextX,
        labelTextY,
        resolvedLabelFill,
        resolvedLabelStroke,
      };
    })
    .filter(Boolean);

  if (!axisScale || renderedMarkers.length === 0) {
    return null;
  }

  return (
    <g ref={markerGroupRef} className="gsl-chart-line-markers">
      {renderedMarkers.map(
        ({
          key,
          marker,
          markerPosition,
          hasLabel,
          labelText,
          clampedLabelBoxX,
          clampedLabelBoxY,
          labelBoxWidth,
          labelBoxHeight,
          labelTextX,
          labelTextY,
          resolvedLabelFill,
          resolvedLabelStroke,
        }) => (
          <g key={key}>
            <line
              className={marker.className}
              x1={isVertical ? markerPosition : plotLeft}
              x2={isVertical ? markerPosition : plotRight}
              y1={isVertical ? plotTop : markerPosition}
              y2={isVertical ? plotBottom : markerPosition}
              stroke={marker.stroke}
              strokeWidth={marker.strokeWidth}
              strokeDasharray={marker.strokeDasharray || undefined}
              style={marker.sx}
            />
            {hasLabel && (
              <g>
                <rect
                  x={clampedLabelBoxX}
                  y={clampedLabelBoxY}
                  width={labelBoxWidth}
                  height={labelBoxHeight}
                  fill={resolvedLabelFill}
                  fillOpacity={marker.labelBackgroundOpacity}
                  stroke={resolvedLabelStroke}
                  strokeWidth={marker.labelBackgroundStrokeWidth}
                  rx={marker.labelCornerRadius}
                  ry={marker.labelCornerRadius}
                />
                <text
                  x={labelTextX}
                  y={labelTextY}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  style={{
                    fill: marker.fontColor,
                    fontFamily: marker.fontFamily,
                    fontSize: `${marker.fontSize}px`,
                    fontWeight: marker.fontWeight,
                    color: marker.fontColor,
                  }}
                >
                  {labelText}
                </text>
              </g>
            )}
          </g>
        ),
      )}
    </g>
  );
}

export default LineMarker;
