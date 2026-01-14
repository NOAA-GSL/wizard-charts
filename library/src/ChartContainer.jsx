import './styles.css';

function ChartContainer({ height = '100%', width = '100%', children, className = '', sx = {} }) {
    return (
        <svg height={height} width={width} className={className} style={sx}>
            {children}
        </svg>
    );
}

export default ChartContainer;
