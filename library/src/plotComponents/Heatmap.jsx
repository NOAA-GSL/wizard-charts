import { useMemo, useRef } from 'react';
import { extent } from 'd3';
import { useChartHelpers } from '../hooks/useChartHelpers';
import useAnimation from '../hooks/useAnimation';
import { mergeDeep } from '../utilities/dataUtilities';
import { defaultHeatmapOptions } from '../utilities/defaultOptions';
import {
  buildContourModel,
  normalizeThresholds,
} from '../utilities/marchingSquares';

function toComparable(value) {
  if (value instanceof Date) return value.getTime();
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function getColorForThresholdIndex(index, thresholds, colors, fallbackFill) {
  if (!Array.isArray(colors) || colors.length === 0) return fallbackFill;
  const colorIndex = Math.max(0, Math.min(index, thresholds.length));
  return colors[colorIndex] ?? colors[colors.length - 1] ?? fallbackFill;
}

function resolveThresholds(inputThresholds, values) {
  const normalized = normalizeThresholds(inputThresholds);
  if (normalized.length > 0) return normalized;

  const [minValue, maxValue] = extent(values);
  const min = Number(minValue);
  const max = Number(maxValue);

  if (!Number.isFinite(min) || !Number.isFinite(max)) return [0.25, 0.5, 0.75];
  if (max <= min) return [min];

  const step = (max - min) / 4;
  return [min + step, min + step * 2, min + step * 3];
}

function Heatmap({ seriesIndex = 0, options = {} }) {
  const finalOptions = mergeDeep(defaultHeatmapOptions, options);
  const {
    className,
    isVisible,
    sx,
    fill,
    colors,
    fillOpacity,
    contourLineColor,
    contourLineWidth,
    contourLineOpacity,
    showContourFill,
    showContourLines,
    resolution,
    interpolationMethod,
    idwPower,
    idwNeighbors,
  } = finalOptions;

  const { getAccessors, getSeriesData, getSeriesScales } = useChartHelpers();
  const accessors = getAccessors(seriesIndex);
  const seriesData = getSeriesData(seriesIndex);
  const { xScale, yScale } = getSeriesScales(seriesIndex);

  const groupRef = useRef(null);

  useAnimation({
    type: 'fadeIn',
    ref: groupRef,
    trigger: seriesData,
  });

  const xIsBand = typeof xScale?.bandwidth === 'function';
  const yIsBand = typeof yScale?.bandwidth === 'function';

  const preparedPoints = useMemo(() => {
    if (!Array.isArray(seriesData)) return [];

    return seriesData
      .map((d) => {
        const xRaw = accessors.x?.(d);
        const yRaw = accessors.y?.(d);
        const valueRaw = accessors.valueKey?.(d);

        const x = toComparable(xRaw);
        const y = toComparable(yRaw);
        const value = Number(valueRaw);

        if (
          x == null ||
          y == null ||
          !Number.isFinite(value) ||
          !Number.isFinite(xScale?.(xRaw)) ||
          !Number.isFinite(yScale?.(yRaw))
        ) {
          return null;
        }

        return { x, y, value };
      })
      .filter(Boolean);
  }, [accessors, seriesData, xScale, yScale]);

  const thresholds = resolveThresholds(
    finalOptions.thresholds,
    preparedPoints.map((p) => p.value),
  );

  const contourModel = (() => {
    if (!xScale || !yScale || xIsBand || yIsBand || preparedPoints.length < 3) {
      return null;
    }

    return buildContourModel({
      points: preparedPoints,
      xScale,
      yScale,
      thresholds,
      resolution,
      interpolationMethod,
      idwPower,
      idwNeighbors,
    });
  })();

  if (!xScale || !yScale || xIsBand || yIsBand || !contourModel) return null;

  const xRange = xScale.range();
  const yRange = yScale.range();
  const xMin = Math.min(...xRange);
  const yMin = Math.min(...yRange);
  const plotWidth = Math.max(0, Math.abs(xRange[1] - xRange[0]));
  const plotHeight = Math.max(0, Math.abs(yRange[1] - yRange[0]));
  const clipPathId = `heatmap-clip-${seriesIndex}`;

  return (
    <g
      ref={groupRef}
      className={className}
      style={{ ...sx, visibility: isVisible ? 'visible' : 'hidden' }}
    >
      <defs>
        <clipPath id={clipPathId}>
          <rect x={xMin} y={yMin} width={plotWidth} height={plotHeight} />
        </clipPath>
      </defs>

      <g clipPath={`url(#${clipPathId})`}>
        {showContourFill && plotWidth > 0 && plotHeight > 0 && (
          <rect
            x={xMin}
            y={yMin}
            width={plotWidth}
            height={plotHeight}
            fill={getColorForThresholdIndex(0, thresholds, colors, fill)}
            fillOpacity={fillOpacity}
          />
        )}

        {showContourFill &&
          contourModel.features.map((feature, index) => {
            const path = contourModel.pathForFeature(feature);
            if (!path) return null;

            return (
              <path
                key={`${seriesIndex}-fill-${String(feature.value)}`}
                d={path}
                fill={getColorForThresholdIndex(
                  index + 1,
                  thresholds,
                  colors,
                  fill,
                )}
                fillOpacity={fillOpacity}
                stroke="none"
              />
            );
          })}

        {showContourLines &&
          contourModel.features.map((feature, index) => {
            const path = contourModel.pathForFeature(feature);
            if (!path) return null;

            const lineColor =
              contourLineColor ||
              getColorForThresholdIndex(
                index + 1,
                thresholds,
                colors,
                '#111111',
              );

            return (
              <path
                key={`${seriesIndex}-line-${String(feature.value)}`}
                d={path}
                fill="none"
                stroke={lineColor}
                strokeWidth={contourLineWidth}
                strokeOpacity={contourLineOpacity}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            );
          })}
      </g>
    </g>
  );
}

export default Heatmap;
