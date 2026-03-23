import { useRef } from 'react';
import { useChartHelpers } from '../hooks/useChartHelpers';
import useAnimation from '../hooks/useAnimation';

function BoxPlot({
  seriesIndex = 0,
  cornerRadius = 2,
  fill = 'var(--gsl-charts-color-1)',
  className = '',
  paddingFactor = 0.8,
  alignment = 'center',
}) {
  const { chartValues, xScale, yScale, getAccessors } = useChartHelpers();

  const accessors = getAccessors(seriesIndex);

  const rectGroupRef = useRef(null);

  // get x positions in pixels of all bars to calculate step and bar width
  const positions = chartValues.data
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
    chartValues.innerWidth / Math.max(1, chartValues.data.length);
  // barWidth is shrunk by a padding factor to create space between bars
  const barWidth = (step || fallback) * paddingFactor;

  useAnimation({
    type: 'growBox',
    ref: rectGroupRef,
    trigger: chartValues.data,
  });

  return (
    <g className={`gsl-chart-bar ${className}`} fill={fill} ref={rectGroupRef}>
      {chartValues.data.map((dataPoint) => {
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

        return (
          <rect
            key={accessors.x(dataPoint)}
            x={x}
            y={y}
            width={barWidth}
            height={height}
            rx={cornerRadius}
            ry={cornerRadius}
            shapeRendering="crispEdges"
            style={{
              transform: 'scaleY(0)',
              transformOrigin: '50% 50%',
              transformBox: 'fill-box',
            }}
          />
        );
      })}
    </g>
  );
}

export default BoxPlot;
