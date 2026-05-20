import { useMemo, useRef } from 'react';
import { useChartHelpers } from '../hooks/useChartHelpers';
import useAnimation from '../hooks/useAnimation';
import { mergeDeep } from '../utilities/dataUtilities';
import { defaultMatrixOptions } from '../utilities/defaultOptions';

import {
  toComparable,
  toTriggerPart,
  resolveThresholds,
  getColorForValue,
  getBandRect,
  buildContinuousXMap,
} from '../utilities/heatmapMatrixHelpers';

function Matrix({ seriesIndex = 0, options = {} }) {
  const finalOptions = mergeDeep(defaultMatrixOptions, options);
  const {
    className,
    colors,
    fill,
    isVisible,
    cellPadding,
    cellWidthFactor,
    timeAnchor,
    stroke,
    strokeWidth,
    showLabels,
    labelFormatter,
    labelColor,
    labelFontSize,
    labelFontWeight,
    sx,
  } = finalOptions;

  const { getAccessors, getSeriesData, getSeriesScales } = useChartHelpers();

  const accessors = getAccessors(seriesIndex);
  const seriesData = getSeriesData(seriesIndex);
  const { xScale, yScale } = getSeriesScales(seriesIndex);

  // Keep fade animation tied to series content changes, not hover motion.
  const animationTrigger = useMemo(() => {
    if (!Array.isArray(seriesData) || seriesData.length === 0) return 'empty';

    return seriesData
      .map((d) => {
        const xValue = accessors.x?.(d);
        const yValue = accessors.y?.(d);
        const value = accessors.valueKey?.(d);
        const label = accessors.labelKey?.(d);

        return [
          toTriggerPart(xValue),
          toTriggerPart(yValue),
          toTriggerPart(value),
          toTriggerPart(label),
        ].join('|');
      })
      .join('||');
  }, [accessors, seriesData]);

  const thresholdValues = resolveThresholds(
    finalOptions.thresholds,
    seriesData
      .map((d) => Number(accessors.valueKey?.(d)))
      .filter(Number.isFinite),
    colors,
  );

  const yIsBand = typeof yScale?.bandwidth === 'function';
  const xIsBand = typeof xScale?.bandwidth === 'function';
  const useContinuousX = !xIsBand;

  const continuousXMap = (() => {
    if (!useContinuousX || !xScale || typeof accessors?.x !== 'function') {
      return new Map();
    }
    return buildContinuousXMap(seriesData, accessors.x, xScale);
  })();

  const groupRef = useRef(null);

  useAnimation({
    type: 'fadeIn',
    ref: groupRef,
    trigger: animationTrigger,
  });

  if (!xScale || !yScale || !yIsBand) return null;

  return (
    <g
      ref={groupRef}
      className={className}
      style={{ ...sx, visibility: isVisible ? 'visible' : 'hidden' }}
    >
      {seriesData.map((d) => {
        const xValue = accessors.x(d);
        const yValue = accessors.y(d);
        const value = accessors.valueKey?.(d);

        if (xValue == null || yValue == null) return null;

        const yRect = getBandRect(yScale, yValue, cellPadding);
        if (!yRect) return null;

        let xRect;
        if (xIsBand) {
          xRect = getBandRect(xScale, xValue, cellPadding);
        } else if (useContinuousX) {
          const comparable = toComparable(xValue);
          if (comparable == null) return null;

          const centerInfo = continuousXMap.get(comparable);
          if (!centerInfo) return null;

          const anchor =
            timeAnchor === 'left'
              ? 'start'
              : timeAnchor === 'right'
                ? 'end'
                : timeAnchor;

          const xRange =
            typeof xScale.range === 'function' ? xScale.range() : [0, 0];
          const xMin = Math.min(...xRange);
          const xMax = Math.max(...xRange);

          let baseWidth;
          if (anchor === 'start') {
            baseWidth = Number.isFinite(centerInfo.nextGap)
              ? centerInfo.nextGap
              : centerInfo.fallbackGap;
          } else if (anchor === 'end') {
            baseWidth = Number.isFinite(centerInfo.prevGap)
              ? centerInfo.prevGap
              : centerInfo.fallbackGap;
          } else {
            const leftHalf = Number.isFinite(centerInfo.prevGap)
              ? centerInfo.prevGap / 2
              : centerInfo.fallbackGap / 2;
            const rightHalf = Number.isFinite(centerInfo.nextGap)
              ? centerInfo.nextGap / 2
              : centerInfo.fallbackGap / 2;
            baseWidth = leftHalf + rightHalf;
          }

          if (!Number.isFinite(baseWidth) || baseWidth <= 0) return null;

          const factor = Math.max(
            0.05,
            Math.min(1, Number(cellWidthFactor) || 1),
          );
          const width = Math.max(0, baseWidth * factor);
          const pad = Math.max(0, Number(cellPadding) || 0);

          let xStart;
          let xEnd;

          if (anchor === 'start') {
            xStart = centerInfo.center;
            xEnd = centerInfo.center + width;
          } else if (anchor === 'end') {
            xEnd = centerInfo.center;
            xStart = centerInfo.center - width;
          } else {
            xStart = centerInfo.center - width / 2;
            xEnd = centerInfo.center + width / 2;
          }

          xStart = Math.max(xMin, xStart);
          xEnd = Math.min(xMax, xEnd);

          xRect = {
            start: xStart + pad,
            size: Math.max(0, xEnd - xStart - 2 * pad),
          };
        } else {
          return null;
        }

        if (!xRect || xRect.size <= 0) return null;

        const cellColor = getColorForValue(
          value,
          thresholdValues,
          colors,
          fill,
        );
        const labelValue = accessors.labelKey ? accessors.labelKey(d) : value;

        return (
          <g
            key={`${seriesIndex}-${String(xValue)}-${String(yValue)}-${String(value)}`}
          >
            <rect
              x={xRect.start}
              y={yRect.start}
              width={xRect.size}
              height={yRect.size}
              fill={cellColor}
              stroke={stroke}
              strokeWidth={strokeWidth}
              shapeRendering="crispEdges"
            />
            {showLabels && (
              <text
                x={xRect.start + xRect.size / 2}
                y={yRect.start + yRect.size / 2}
                fill={labelColor}
                fontSize={labelFontSize}
                fontWeight={labelFontWeight}
                textAnchor="middle"
                dominantBaseline="middle"
                pointerEvents="none"
              >
                {typeof labelFormatter === 'function'
                  ? labelFormatter(labelValue, d)
                  : labelValue}
              </text>
            )}
          </g>
        );
      })}
    </g>
  );
}

export default Matrix;
