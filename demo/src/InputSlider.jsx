function InputSlider({ dimensions, handleSliderChange, label, id }) {
    return (
        <div className="input-slider">
            <label htmlFor={`${id}-slider`}>{label}:</label>
            <p>{dimensions[id]}</p>
            <input
                onChange={handleSliderChange(id)}
                id={`${id}-slider`}
                type="range"
                min="200"
                step="10"
                max="1000"
            />
        </div>
    );
}

export default InputSlider;
