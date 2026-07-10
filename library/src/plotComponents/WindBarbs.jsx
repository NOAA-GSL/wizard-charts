import { useRef } from 'react';
import { useChartHelpers } from '../hooks/useChartHelpers';
import useAnimation from '../hooks/useAnimation';
import { mergeDeep } from '../utilities/dataUtilities';
import { defaultWindBarbsOptions } from '../utilities/defaultOptions';
import { buildWindBarbElements } from '../utilities/windBarbPaths';

/**
 * Renders the SVG shapes for a single wind barb based on the element
 * descriptors returned by buildWindBarbElements.
 */
function WindBarbGlyph({ elements, color, strokeWidth }) {
  return elements.map((el, i) => {
    if (el.type === 'circle') {
      return (
        <circle
          key={i}
          cx={el.cx}
          cy={el.cy}
          r={el.r}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
        />
      );
    }

    if (el.type === 'staff' || el.type === 'barb') {
      return (
        <line
          key={i}
          x1={el.x1}
          y1={el.y1}
          x2={el.x2}
          y2={el.y2}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
      );
    }

    if (el.type === 'pennant') {
      const pts = el.points.map(([px, py]) => `${px},${py}`).join(' ');
      return (
        <polygon
          key={i}
          points={pts}
          fill={color}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinejoin="round"
        />
      );
    }

    return null;
  });
}

/**
 * WindBarbs renders meteorological wind barbs at each data point.
 *
 * Each datum requires an x position, y position, wind speed, and wind
 * direction. Speed maps to barb shape (unit-agnostic: every 5 units adds one
 * flag feature). Direction is the meteorological convention — degrees the wind
 * comes FROM, clockwise from north — and controls the rotation of each barb so
 * the staff points toward the wind's origin.
 *
 * Works both as a standalone scatter-style overlay (like Circle) and as a
 * gridded layer paired with ContourGrid.
 */
function WindBarbs({ seriesIndex = 0, options = {} }) {
  const finalOptions = mergeDeep(defaultWindBarbsOptions, options);
  const { color, size, strokeWidth, className, sx, isVisible } = finalOptions;

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

  if (!xScale || !yScale) return null;

  return (
    <g
      ref={groupRef}
      className={className}
      style={{ ...sx, visibility: isVisible ? 'visible' : 'hidden' }}
    >
      {seriesData.map((d, i) => {
        const xVal = accessors.x(d);
        const yVal = accessors.y(d);

        if (xVal == null || yVal == null) return null;

        const cx = xScale(xVal);
        const cy = yScale(yVal);

        if (!Number.isFinite(cx) || !Number.isFinite(cy)) return null;

        const speed = accessors.speedKey ? Number(accessors.speedKey(d)) : 0;
        const direction = accessors.directionKey
          ? Number(accessors.directionKey(d))
          : 0;

        const elements = buildWindBarbElements(
          Number.isFinite(speed) ? speed : 0,
          size,
        );

        return (
          <g
            // eslint-disable-next-line react/no-array-index-key
            key={i}
            transform={`translate(${cx}, ${cy}) rotate(${Number.isFinite(direction) ? direction : 0})`}
          >
            <WindBarbGlyph
              elements={elements}
              color={color}
              strokeWidth={strokeWidth}
            />
          </g>
        );
      })}
    </g>
  );
}

export default WindBarbs;
