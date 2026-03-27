import { dataVizColors } from 'desi-charts';

function InputColor({ color, onChange, id }) {
  return (
    <div className="input-color">
      <label htmlFor={`${id}-color-input`}>Color:</label>
      <select onChange={(e) => onChange(e.target.value)} value={color}>
        {Object.entries(dataVizColors).map(([name, hex]) => (
          <option key={name} value={hex}>
            {name}
          </option>
        ))}
        {/* // todo: get custom colors working */}
        {/* <option value="custom">Custom</option> */}
      </select>
      {color === 'custom' && (
        <input
          type="color"
          id={`${id}-color-input`}
          value={color}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </div>
  );
}

export default InputColor;
