import { line } from 'd3';

function Line({ data, xScale, yScale, xValue, yValue, className = '' }) {
    return (
        <path
            className={`gsl-chart-line ${className}`}
            d={line()
                .x((d) => xScale(xValue(d)))
                .y((d) => yScale(yValue(d)))(data)}
        />
    );
}

export default Line;
