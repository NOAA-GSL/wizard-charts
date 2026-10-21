import { useRef } from 'react';
import { useChartHelpers } from '../hooks/useChartHelpers';
import useAnimation from '../hooks/useAnimation';
import { mergeDeep } from '../utilities/dataUtilities';
import {
  getBoxPlotBounds,
  getBoxPlotWidth,
} from '../utilities/boxPlotGeometry';
import { defaultBoxPlotOptions } from '../utilities/defaultOptions';

function BoxPlot({ seriesIndex = 0, options = {} }) {
  const finalOptions = mergeDeep(defaultBoxPlotOptions, options);
  const {
    alignment,
    cornerRadius,
    fill,
    isVisible,
    className,
    paddingFactor,
    stroke,
    strokeMedian,
    strokeWhisker,
    strokeWidth,
    sx,
  } = finalOptions;

  const { chartValues, getAccessors, getSeriesData, getSeriesScales } =
    useChartHelpers();

  const accessors = getAccessors(seriesIndex);
  const seriesData = getSeriesData(seriesIndex);
  const { xScale, yScale } = getSeriesScales(seriesIndex);
  const barWidth = getBoxPlotWidth({
    xAccessor: accessors.x,
    innerWidth: chartValues.innerWidth,
    paddingFactor,
    seriesData,
    seriesIndex,
    xScale,
  });

  const rectGroupRef = useRef(null);
  const medianGroupRef = useRef(null);

  useAnimation({
    type: 'growBox',
    ref: rectGroupRef,
    trigger: seriesData,
  });

  // animate median lines separately (scale from center + fade)
  useAnimation({
    type: 'growMedian',
    ref: medianGroupRef,
    trigger: seriesData,
  });

  // animate whisker lines (min/max) using stroke-dashoffset drawing
  useAnimation({
    type: 'drawLines',
    ref: rectGroupRef,
    trigger: seriesData,
  });

  if (!xScale || !yScale) return null;

  return (
    <g style={{ visibility: isVisible ? 'visible' : 'hidden' }}>
      <g className={className} style={sx} ref={rectGroupRef}>
        {seriesData.map((dataPoint) => {
          const bounds = getBoxPlotBounds({
            x: xScale(accessors.x(dataPoint)),
            width: barWidth,
            alignment,
          });
          if (!bounds) return null;
          const x = bounds.left;

          // prefer box-specific accessors at top-level (q3YKey/q1YKey); fall back to primary `y`
          const q3Val = accessors.q3YKey
            ? accessors.q3YKey(dataPoint)
            : accessors.y(dataPoint);
          const q1Val = accessors.q1YKey
            ? accessors.q1YKey(dataPoint)
            : accessors.y(dataPoint);
          const y = yScale(q3Val); // top of the bar
          const baseline = yScale(q1Val); // bottom of the bar
          const height = baseline - y; // height from top to baseline

          /**
           * // Could also stack multiple bars with this example
           * const groupBand = scaleBand().domain(seriesKeys).range([ -step/2, step/2 ]).paddingInner(0.1);
           * const barW = groupBand.bandwidth();
           * const cx = xScale(xValue);
           * const x = cx + groupBand(seriesKey); // already offset from center
           */

          // compute center y for whisker start
          const centerY = y + height / 2;

          // whisker end positions (fall back gracefully if accessors missing)
          const maxVal = accessors.maxYKey
            ? accessors.maxYKey(dataPoint)
            : undefined;
          const minVal = accessors.minYKey
            ? accessors.minYKey(dataPoint)
            : undefined;
          const yMax = typeof maxVal !== 'undefined' ? yScale(maxVal) : null;
          const yMin = typeof minVal !== 'undefined' ? yScale(minVal) : null;

          return (
            <g key={accessors.x(dataPoint)}>
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={height}
                rx={cornerRadius}
                ry={cornerRadius}
                fill={fill}
                stroke={stroke}
                strokeWidth={strokeWidth}
                shapeRendering="crispEdges"
                style={{
                  transform: 'scaleY(0)',
                  transformOrigin: '50% 50%',
                  transformBox: 'fill-box',
                }}
              />
              {yMax != null && (
                <line
                  x1={bounds.center}
                  x2={bounds.center}
                  y1={centerY}
                  y2={yMax}
                  stroke={strokeWhisker}
                  strokeWidth={strokeWidth}
                  strokeLinecap="round"
                  shapeRendering="crispEdges"
                />
              )}
              {yMin != null && (
                <line
                  x1={bounds.center}
                  x2={bounds.center}
                  y1={centerY}
                  y2={yMin}
                  stroke={strokeWhisker}
                  strokeWidth={strokeWidth}
                  strokeLinecap="round"
                  shapeRendering="crispEdges"
                />
              )}
            </g>
          );
        })}
      </g>

      {/* median line moved to separate group to avoid drawLines animation */}
      <g ref={medianGroupRef}>
        {seriesData.map((dataPoint) => {
          const bounds = getBoxPlotBounds({
            x: xScale(accessors.x(dataPoint)),
            width: barWidth,
            alignment,
          });
          if (!bounds) return null;

          // compute box center Y to start median animation from
          const q3Val = accessors.q3YKey
            ? accessors.q3YKey(dataPoint)
            : accessors.y(dataPoint);
          const q1Val = accessors.q1YKey
            ? accessors.q1YKey(dataPoint)
            : accessors.y(dataPoint);
          const yTop = yScale(q3Val);
          const yBaseline = yScale(q1Val);
          const centerY = yTop + (yBaseline - yTop) / 2;

          const medianVal = accessors.medianYKey
            ? accessors.medianYKey(dataPoint)
            : undefined;
          const yMedian =
            typeof medianVal !== 'undefined' ? yScale(medianVal) : null;

          if (yMedian == null) return null;

          // startTranslateY moves the line from box center to final median
          const startTranslateY = centerY - yMedian;

          return (
            <line
              key={`median-${accessors.x(dataPoint)}`}
              className="median"
              x1={bounds.left}
              x2={bounds.right}
              y1={yMedian}
              y2={yMedian}
              stroke={strokeMedian}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              shapeRendering="crispEdges"
              style={{
                ['--startTranslateY']: `${startTranslateY}px`,
                transform: `translateY(var(--startTranslateY))`,
              }}
            />
          );
        })}
      </g>
    </g>
  );
}

export default BoxPlot;
