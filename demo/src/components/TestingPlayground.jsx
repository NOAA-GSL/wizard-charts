import { useState } from 'react';
import { ChartContainer, timeFormatter } from '@noaa-gsl/wizard-charts';
import '@noaa-gsl/wizard-charts/styles.css';
import { testingDataPresets } from '../data/testingDataPresets';

const evaluateUserCode = (code, expectedType, sourceName) => {
  const result = new Function(
    'timeFormatter',
    `'use strict'; return (${code});`,
  )(timeFormatter);

  if (expectedType === 'array' && !Array.isArray(result)) {
    throw new Error(`${sourceName} must evaluate to an array.`);
  }

  if (
    expectedType === 'object' &&
    (Array.isArray(result) || typeof result !== 'object' || result === null)
  ) {
    throw new Error(`${sourceName} must evaluate to an object.`);
  }

  return result;
};

function TestingPlayground() {
  const initialDataPreset = testingDataPresets.data[0];
  const initialOptionsPreset = testingDataPresets.options[0];

  const [selectedDataPresetId, setSelectedDataPresetId] = useState(
    initialDataPreset.id,
  );
  const [selectedOptionsPresetId, setSelectedOptionsPresetId] = useState(
    initialOptionsPreset.id,
  );
  const [dataCode, setDataCode] = useState(initialDataPreset.source);
  const [optionsCode, setOptionsCode] = useState(initialOptionsPreset.source);
  const [chartData, setChartData] = useState(initialDataPreset.value);
  const [chartOptions, setChartOptions] = useState(initialOptionsPreset.value);
  const [errorMessage, setErrorMessage] = useState('');

  const handleApply = () => {
    try {
      const parsedData = evaluateUserCode(dataCode, 'array', 'Data code');
      const parsedOptions = evaluateUserCode(
        optionsCode,
        'object',
        'Options code',
      );
      setChartData(parsedData);
      setChartOptions(parsedOptions);
      setErrorMessage('');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Invalid code.');
    }
  };

  const handleReset = () => {
    const activeDataPreset = testingDataPresets.data.find(
      (preset) => preset.id === selectedDataPresetId,
    );
    const activeOptionsPreset = testingDataPresets.options.find(
      (preset) => preset.id === selectedOptionsPresetId,
    );

    if (!activeDataPreset || !activeOptionsPreset) {
      return;
    }

    setDataCode(activeDataPreset.source);
    setOptionsCode(activeOptionsPreset.source);
    setChartData(activeDataPreset.value);
    setChartOptions(activeOptionsPreset.value);
    setErrorMessage('');
  };

  const handleDataPresetChange = (event) => {
    const nextPresetId = event.target.value;
    const nextPreset = testingDataPresets.data.find(
      (preset) => preset.id === nextPresetId,
    );

    if (!nextPreset) {
      return;
    }

    setSelectedDataPresetId(nextPresetId);
    setDataCode(nextPreset.source);
    setChartData(nextPreset.value);
    setErrorMessage('');
  };

  const handleOptionsPresetChange = (event) => {
    const nextPresetId = event.target.value;
    const nextPreset = testingDataPresets.options.find(
      (preset) => preset.id === nextPresetId,
    );

    if (!nextPreset) {
      return;
    }

    setSelectedOptionsPresetId(nextPresetId);
    setOptionsCode(nextPreset.source);
    setChartOptions(nextPreset.value);
    setErrorMessage('');
  };

  return (
    <div className="testing-data-layout">
      <div className="testing-data-controls">
        <div className="testing-data-controls-header">
          <h2>Testing Playground</h2>
          <p>Select a default, edit code, then apply changes to the chart.</p>
        </div>

        <div className="testing-data-actions">
          <button type="button" onClick={handleApply}>
            Apply Changes
          </button>
          <button
            type="button"
            className="secondary-button"
            onClick={handleReset}
          >
            Reset To Presets
          </button>
        </div>

        {errorMessage ? (
          <p className="testing-data-error" role="alert">
            {errorMessage}
          </p>
        ) : null}

        <div className="testing-data-editor-group">
          <div className="testing-data-editor-header">
            <label htmlFor="data-presets">Data Preset</label>
            <select
              id="data-presets"
              value={selectedDataPresetId}
              onChange={handleDataPresetChange}
            >
              {testingDataPresets.data.map((preset) => (
                <option key={preset.id} value={preset.id}>
                  {preset.label}
                </option>
              ))}
            </select>
          </div>
          <textarea
            className="testing-data-textarea"
            spellCheck={false}
            value={dataCode}
            onChange={(event) => setDataCode(event.target.value)}
            aria-label="Data array editor"
          />
        </div>

        <div className="testing-data-editor-group">
          <div className="testing-data-editor-header">
            <label htmlFor="options-presets">Options Preset</label>
            <select
              id="options-presets"
              value={selectedOptionsPresetId}
              onChange={handleOptionsPresetChange}
            >
              {testingDataPresets.options.map((preset) => (
                <option key={preset.id} value={preset.id}>
                  {preset.label}
                </option>
              ))}
            </select>
          </div>
          <textarea
            className="testing-data-textarea"
            spellCheck={false}
            value={optionsCode}
            onChange={(event) => setOptionsCode(event.target.value)}
            aria-label="Options object editor"
          />
        </div>
      </div>

      <div className="testing-data-chart">
        <ChartContainer
          height={600}
          // width={1200}
          data={chartData}
          options={chartOptions}
        />
      </div>
    </div>
  );
}

export default TestingPlayground;
