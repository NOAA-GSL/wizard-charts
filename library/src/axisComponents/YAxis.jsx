function YAxis({
    data,
    xScale,
    yScale,
    ticks,
    margin,
    isLeftLocation = true,
    className = null,
    tickOffset = 10,
}) {
    const xDomain = xScale.domain();
    const yDomain = yScale.domain();

    const yMiddle = yScale(yDomain[0]) + (yScale(yDomain[1]) - yScale(yDomain[0])) / 2;

    // tick marks, labels and legend are offset in different directions based on location
    const locationTickOffset = isLeftLocation ? tickOffset : -tickOffset;
    // not enough padding on right side, so add 2 to the right side
    const legendTickOffset = isLeftLocation ? margin.left : -margin.right + 2;

    // this determines whether the x value is the left or right side of the chart
    const xDomainPosition = isLeftLocation ? 0 : 1;

    return (
        <g className={`x1d-axis ${className}`}>
            {/* vertical line for y-axis, `location` will set the x values */}
            <line
                x1={xScale(xDomain[xDomainPosition])}
                x2={xScale(xDomain[xDomainPosition])}
                y1={yScale(yDomain[0])}
                y2={yScale(yDomain[1])}
            />
            {/* legend */}
            <text
                className="x1d-axis-label"
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
                        x1={xScale(xDomain[xDomainPosition]) - locationTickOffset}
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
