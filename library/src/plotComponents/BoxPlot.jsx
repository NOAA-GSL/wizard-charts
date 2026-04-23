import { useRef } from 'react';
import { useChartHelpers } from '../hooks/useChartHelpers';
import useAnimation from '../hooks/useAnimation';
import { mergeDeep } from '../utilities/dataUtilities';
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

  const { chartValues, xScale, yScale, getAccessors, getSeriesData } =
    useChartHelpers();

  const accessors = getAccessors(seriesIndex);
  const seriesData = getSeriesData(seriesIndex);

  const rectGroupRef = useRef(null);
  const medianGroupRef = useRef(null);

  // get x positions in pixels of all bars to calculate step and bar width
  const positions = seriesData
    .map((d) => xScale(accessors.x(d)))
    .filter((p) => Number.isFinite(p))
    .sort((a, b) => a - b);

  // step is the pixel distance between neighboring points
  let step = 0;
  if (positions.length > 1) {
    // get difference between all points (remove first index)
    const diffs = positions.slice(1).map((value, i) => value - positions[i]);
    // set step to the smallest difference, but not less than 0
    // this ensures no overlap
    step = Math.max(0, Math.min(...diffs));
  }
  // if step fails, use this fallback that divides the width by the number of points
  const fallback =
    chartValues.innerWidth / Math.max(1, seriesData.length);
  // barWidth is shrunk by a padding factor to create space between bars
  const barWidth = (step || fallback) * paddingFactor;

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

  return (
    <g style={{ visibility: isVisible ? 'visible' : 'hidden' }}>
      <g className={className} style={sx} ref={rectGroupRef}>
        {seriesData.map((dataPoint) => {
          const cx = xScale(accessors.x(dataPoint));
          let x;
          if (alignment === 'right') x = cx;
          else if (alignment === 'left') x = cx - barWidth;
          else x = cx - barWidth / 2; // center the bar on the x value

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
                  x1={x + barWidth / 2}
                  x2={x + barWidth / 2}
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
                  x1={x + barWidth / 2}
                  x2={x + barWidth / 2}
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
          const cx = xScale(accessors.x(dataPoint));
          let xPos;
          if (alignment === 'right') xPos = cx;
          else if (alignment === 'left') xPos = cx - barWidth;
          else xPos = cx - barWidth / 2;

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
              x1={xPos}
              x2={xPos + barWidth}
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
