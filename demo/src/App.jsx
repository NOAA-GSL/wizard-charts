import { useState } from 'react';
import { ChartContainer, XAxis, YAxis } from 'desi-charts';
import InputSlider from './InputSlider';
import { generateRandomData } from './helperFunctions';
import { scaleLinear, extent } from 'd3';

import 'desi-charts/desi-charts.css';

const margin = { top: 40, right: 40, bottom: 40, left: 40 };

function App() {
    const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
    const [data, setData] = useState(generateRandomData({ numPoints: 50, variance: 5 }));

    const handleSliderChange = (dimension) => (event) => {
        const value = event.target.value;
        setDimensions((prev) => ({ ...prev, [dimension]: value }));
    };

    console.log('data:', data);

    // Scales
    const innerWidth = Math.max(0, dimensions.width - margin.left - margin.right);
    const xScale = scaleLinear()
        .domain(extent(data, (d) => d.x))
        .range([margin.left, innerWidth + margin.left]);
    const innerHeight = Math.max(0, dimensions.height - margin.top - margin.bottom);
    const yScale = scaleLinear()
        .domain(extent(data, (d) => d.y))
        .range([innerHeight, margin.top])
        .nice();

    console.log('xScale ticks:', xScale.ticks());
    console.log('xScale domain:', xScale.domain());
    console.log('yScale domain:', yScale.domain());

    return (
        <div className="app-container">
            <h1>DESI Charts!</h1>
            <div className="flex gap-10">
                <InputSlider
                    dimensions={dimensions}
                    handleSliderChange={handleSliderChange}
                    label="Width"
                    id="width"
                />
                <InputSlider
                    dimensions={dimensions}
                    handleSliderChange={handleSliderChange}
                    label="Height"
                    id="height"
                />
            </div>
            <ChartContainer
                height={dimensions.height}
                width={dimensions.width}
                sx={{ border: '1px solid white' }}
            >
                <XAxis
                    xScale={xScale}
                    yScale={yScale}
                    innerHeight={innerHeight}
                    ticks={xScale.ticks().map((value) => ({ value, label: value.toString() }))}
                />
                <YAxis
                    data={data}
                    xScale={xScale}
                    yScale={yScale}
                    margin={margin}
                    ticks={yScale.ticks().map((value) => ({ value, label: value.toString() }))}
                />
            </ChartContainer>
        </div>
    );
}

export default App;
