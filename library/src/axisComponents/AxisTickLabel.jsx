function AxisTickLabel({ tick, style, x = 0, y = 0 }) {
  if (!tick.showLabel) return null;

  const { angle, textAnchor, offsetX, offsetY, lines } = tick.labelGeometry;

  return (
    <text
      className="gsl-chart-tick-label"
      style={style}
      dominantBaseline="central"
      textAnchor={textAnchor}
      aria-label={lines ? tick.label : undefined}
      transform={`translate(${x + offsetX}, ${y + offsetY}) rotate(${angle})`}
    >
      {lines
        ? lines.map((line) => (
            <tspan key={line.y} x={0} y={line.y}>
              {line.text}
            </tspan>
          ))
        : tick.label}
    </text>
  );
}

export default AxisTickLabel;
