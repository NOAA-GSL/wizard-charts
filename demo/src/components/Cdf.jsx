import { useState } from 'react';
import { ChartContainer } from '@noaa-gsl/wizard-charts';
import tempData from '../data/tempData';

const variableName = 'precipitation_accumulation_6_hour_percentiles';
const percentiles = tempData.coords[`percentile_${variableName}`].data;
const forecastTimes = tempData.coords[`time_${variableName}`].data;
const precipitation = tempData.data_vars[variableName];
const forecastData = precipitation.data.map((amounts) =>
  percentiles.map((percentile, index) => ({
    amount: amounts[index],
    percentile,
  })),
);

const options = {
  animationDuration: 0,
  legend: { enabled: false },
  series: [
    {
      id: 'precipitation-cdf',
      type: 'line',
      name: 'Cumulative Probability',
      xKey: 'amount',
      yKey: 'percentile',
      units: '%',
      readoutPrecision: 0,
      stroke: '#0fb5ae',
      className: 'cdf-line',
    },
  ],
  axes: {
    x: {
      type: 'linear',
      domainMin: 0,
      nice: true,
      hasGridLines: true,
      units: precipitation.attrs.units,
      label: { text: '6-Hour Precipitation' },
      ticks: { amount: 6 },
    },
    y: {
      type: 'linear',
      domainMin: 0,
      domainMax: 100,
      hasGridLines: true,
      units: '%',
      label: { text: 'Cumulative Probability' },
    },
  },
  readout: {
    hoverMode: 'local',
    titleFormatter: (value) =>
      `${Number(value).toFixed(3)} ${precipitation.attrs.units}`,
  },
};

export default function Cdf() {
  const [forecastIndex, setForecastIndex] = useState(0);
  const [snapTo, setSnapTo] = useState('nearestPoint');

  return (
    <section
      className="readout-demo-chart"
      style={{ maxWidth: 960, marginBottom: 32 }}
    >
      <h2>6-Hour Precipitation CDF</h2>
      <div className="readout-demo-controls">
        <label htmlFor="cdf-forecast-time">Forecast Time (UTC)</label>
        <select
          id="cdf-forecast-time"
          value={forecastIndex}
          onChange={(event) => setForecastIndex(Number(event.target.value))}
        >
          {forecastTimes.map((time, index) => (
            <option key={time} value={index}>
              {time.slice(0, 16).replace('T', ' ')}
            </option>
          ))}
        </select>
        <label htmlFor="cdf-snap-to">Readout Position</label>
        <select
          id="cdf-snap-to"
          value={snapTo}
          onChange={(event) => setSnapTo(event.target.value)}
        >
          <option value="nearestPoint">Nearest Point</option>
          <option value="none">Pointer</option>
        </select>
      </div>
      <ChartContainer
        data={forecastData[forecastIndex]}
        options={{ ...options, readout: { ...options.readout, snapTo } }}
        height={460}
        className="cdf-chart"
      />
    </section>
  );
}
