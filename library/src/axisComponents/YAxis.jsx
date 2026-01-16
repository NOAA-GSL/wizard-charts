import { useChartHelpers } from '../hooks/useChartHelpers';

function YAxis({
  isLeftLocation = true,
  className = null,
  tickLength = 5,
  tickOffset = 10,
}) {
  const { getChartValues, getXScale, getYScale } = useChartHelpers();

  const { data, margin } = getChartValues();
  const xScale = getXScale();
  const yScale = getYScale();
  const xDomain = xScale.domain();
  const yDomain = yScale.domain();

  const ticks = yScale
    .ticks()
    .map((value) => ({ value, label: value.toString() }));

  const yMiddle =
    yScale(yDomain[0]) + (yScale(yDomain[1]) - yScale(yDomain[0])) / 2;

  // tick marks, labels and legend are offset in different directions based on location
  const locationTickOffset = isLeftLocation ? tickOffset : -tickOffset;
  // not enough padding on right side, so add 2 to the right side
  const legendTickOffset = isLeftLocation ? margin.left : -margin.right + 2;

  // this determines whether the x value is the left or right side of the chart
  const xDomainPosition = isLeftLocation ? 0 : 1;

  return (
    <g className={`gsl-chart-axis ${className}`}>
      {/* vertical line for y-axis, `location` will set the x values */}
      <line
        x1={xScale(xDomain[xDomainPosition])}
        x2={xScale(xDomain[xDomainPosition])}
        y1={yScale(yDomain[0])}
        y2={yScale(yDomain[1])}
      />
      {/* legend */}
      <text
        className="gsl-chart-axis-label"
        alignmentBaseline={`${isLeftLocation ? 'before-edge' : 'after-edge'}`}
        textAnchor="middle"
        transform={`translate(${xScale(xDomain[xDomainPosition]) - legendTickOffset}, ${yMiddle}) rotate(-90)`}
      >
        {data.ylegend}
      </text>
      {ticks.map((tick) => (
        <g key={tick.value} transform={`translate(0, ${yScale(tick.value)})`}>
          <line
            x2={xScale(xDomain[xDomainPosition])}
            // todo: well, this isn't using the tickLength prop...
            x1={xScale(xDomain[xDomainPosition]) - locationTickOffset / 2}
          />
          <text
            style={{
              alignmentBaseline: 'central', // central looks better than middle
              textAnchor: `${isLeftLocation ? 'end' : 'start'}`,
            }}
            x={xScale(xDomain[xDomainPosition]) - locationTickOffset}
          >
            {tick.label === '' ? tick.value : tick.label}
          </text>
        </g>
      ))}
    </g>
  );
}

export default YAxis;
