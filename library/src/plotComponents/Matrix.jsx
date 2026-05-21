import { useMemo, useRef } from 'react';
import { useChartHelpers } from '../hooks/useChartHelpers';
import useAnimation from '../hooks/useAnimation';
import { mergeDeep } from '../utilities/dataUtilities';
import { defaultMatrixOptions } from '../utilities/defaultOptions';
import { resolveThresholds } from '../utilities/thresholdUtilities';

import {
  toTriggerPart,
  getColorForValue,
  getMatrixCellRect,
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

        const cellRect = getMatrixCellRect({
          xValue,
          yValue,
          xScale,
          yScale,
          xIsBand,
          useContinuousX,
          continuousXMap,
          timeAnchor,
          cellWidthFactor,
          cellPadding,
        });
        if (!cellRect) return null;

        const { xRect, yRect } = cellRect;

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
