import { useRef } from 'react';
import { useChartHelpers } from '../hooks/useChartHelpers';
import useAnimation from '../hooks/useAnimation';
import { mergeDeep } from '../utilities/dataUtilities';
import { defaultBarOptions } from '../utilities/defaultOptions';

function Bar({ seriesIndex = 0, options = {} }) {
  const finalOptions = mergeDeep(defaultBarOptions, options);
  const {
    alignment,
    cornerRadius,
    fill,
    className,
    paddingFactor,
    stroke,
    strokeWidth,
    sx,
  } = finalOptions;

  const { chartValues, xScale, yScale, yDomain, getAccessors } =
    useChartHelpers();

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

  // placeholder for now showing how to possibly handle bars that have a time duration
  /**
   * // inside render for each datum (assumes xScale is scaleTime or linear with timestamps)
   * const tEnd = accessors.x(d); // Date or ms
   * const tStart = accessors.xStart ? accessors.xStart(d) : new Date(new Date(tEnd).getTime() - 6 * 3600_000);
   * const x0 = xScale(tStart);
   * const x1 = xScale(tEnd);
   * const x = Math.min(x0, x1);
   * const width = Math.max(0, Math.abs(x1 - x0));
   */

  useAnimation({
    type: 'growBar',
    ref: rectGroupRef,
    trigger: chartValues.data,
  });

  return (
    <g className={className} style={sx} ref={rectGroupRef}>
      {chartValues.data.map((dataPoint) => {
        const cx = xScale(accessors.x(dataPoint));
        // default width uses computed barWidth; for band scales use bandwidth
        let width = barWidth;
        let x;

        // if bandwidth is available, use it instead of computed barWidth and apply alignment within the band
        if (typeof xScale.bandwidth === 'function') {
          const bandStart = xScale(accessors.x(dataPoint));
          const band = xScale.bandwidth();
          width = band * paddingFactor;
          if (alignment === 'left') {
            x = bandStart;
          } else if (alignment === 'right') {
            x = bandStart + (band - width);
          } else {
            x = bandStart + (band - width) / 2;
          }
        } else {
          if (!Number.isFinite(cx)) return null;
          if (alignment === 'right') x = cx;
          else if (alignment === 'left') x = cx - width;
          else x = cx - width / 2; // center
        }

        const y = yScale(accessors.y(dataPoint)); // top of the bar
        const baseline = yScale(yDomain[0]); // bottom of the bar
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
            width={width}
            height={height}
            rx={cornerRadius}
            ry={cornerRadius}
            stroke={stroke}
            strokeWidth={strokeWidth}
            fill={fill}
            shapeRendering="crispEdges"
            style={{
              transform: 'scaleY(0)',
              transformOrigin: '50% 100%',
              transformBox: 'fill-box',
            }}
          />
        );
      })}
    </g>
  );
}

export default Bar;
