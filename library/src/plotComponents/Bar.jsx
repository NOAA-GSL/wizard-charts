import { useRef, useEffect, useId, useMemo } from 'react';
// import { scaleBand } from 'd3';
import { useChartHelpers } from '../hooks/useChartHelpers';
import useAnimation from '../hooks/useAnimation';

function Bar({
  cornerRadius = 2,
  color = 'var(--gsl-charts-color-1)',
  className = '',
  paddingFactor = 0.8,
}) {
  const {
    chartValues,
    yScale,
    xScale,
    domains,
    registerSeries,
    unregisterSeries,
  } = useChartHelpers();

  // todo: hmm, I was using getAccessors from chartHelpers but it was causing an infinite loop
  const accessors = useMemo(() => {
    return {
      x: (d) => d.x, // or prop-provided accessor
      y: (d) => d.y,
    };
  }, []);

  const id = useId();
  const idRef = useRef(`bar-${id}`);
  const rectGroupRef = useRef(null);

  // todo: I probably don't want to appy band scale like this, but this
  // todo: was intended to get things started quickly
  // const xScale = scaleBand()
  //   .domain(computedDomains.x)
  //   .range(getRange('x', chartValues))
  //   .paddingInner(0.2)
  //   .paddingOuter(0.2);

  useEffect(() => {
    registerSeries({
      id: idRef.current,
      accessors,
      scaleHint: { x: 'linear', y: 'linear' }, // children hint if band/linear/time
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    return () => unregisterSeries(idRef.current);
  }, [registerSeries, unregisterSeries, accessors]);

  useAnimation({
    type: 'growBar',
    ref: rectGroupRef,
    trigger: chartValues.data,
  });

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

  // return if we don't have scales yet
  if (!xScale || !yScale) return null;

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

  return (
    <g className={`gsl-chart-bar ${className}`} fill={color} ref={rectGroupRef}>
      <g
        style={{
          visibility: chartValues.animationsLocked ? 'hidden' : undefined,
        }}
      >
        {chartValues.data.map((dataPoint) => {
          const cx = xScale(accessors.x(dataPoint));
          const x = cx - barWidth / 2; // center the bar on the x value
          const y = yScale(accessors.y(dataPoint)); // top of the bar
          const baseline = yScale(domains.y[0]); // bottom of the bar
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
                transformOrigin: `center ${baseline}px`,
                // animation: 'growBar 1s forwards',
              }}
            />
          );
        })}
      </g>
    </g>
  );
}

export default Bar;
