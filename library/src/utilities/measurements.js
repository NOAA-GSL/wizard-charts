// setting up canvas outside of function to prevent repeated creation
const canvas = document.createElement('canvas');
const context = canvas.getContext('2d');

/**
 * Measures the dimensions of a given text string using a canvas context.
 *
 * @param {string} text - The text to measure.
 * @param {string} font - The CSS font property string, e.g. '400 16px Open Sans'.
 *   Should be in the format: '[font-weight] [font-size] [font-family]'.
 *   Font weight can be omitted, a number (e.g., 400, 700) or a keyword (e.g., 'bold').
 * @param {number} [rotate=0] - Degrees to rotate the text before measuring (not commonly used).
 * @returns {TextMetrics} The TextMetrics object containing width and other properties.
 *
 * @example
 * const metrics = getTextDimensions('Legend', '700 14px Arial');
 * console.log(metrics.width);
 */
export function getTextDimensions(text, font, rotate = 0) {
  context.save();
  context.font = font;
  const metrics = context.measureText(text);
  const { width } = metrics;
  const height = metrics.fontBoundingBoxAscent + metrics.fontBoundingBoxDescent;
  // now we need to calculate the rotated width and height
  const radians = (rotate * Math.PI) / 180;
  const rotatedWidth = Math.abs(width * Math.cos(radians)) + Math.abs(height * Math.sin(radians));
  const rotatedHeight = Math.abs(width * Math.sin(radians)) + Math.abs(height * Math.cos(radians));
  context.restore();
  return { width: rotatedWidth, height: rotatedHeight };
}

// takes in an array of labels with a name property and a font, '700 14px Arial'
export function getMaxTextDimensions(textArray, font, rotate = 0) {
  // variable to store the maximum label width
  let maxLabelWidth = 0;
  let maxLabelHeight = 0;

  // Iterate over all the labels to find the maximum width
  textArray.forEach((item) => {
    const { width: labelWidth, height: labelHeight } = getTextDimensions(item, font, rotate);
    if (labelWidth > maxLabelWidth) {
      maxLabelWidth = Math.ceil(labelWidth);
    }
    if (labelHeight > maxLabelHeight) {
      maxLabelHeight = Math.ceil(labelHeight);
    }
  });

  return { width: maxLabelWidth, height: maxLabelHeight };
}

export function getTransformProps(isHorizontal, anchorPoint, tickLength, tickAngle = 0) {
  // guard against string input
  const tickAngleNumber = Number(tickAngle);
  const isNegativeTick = tickLength < 0;

  let transform = '';
  let textAnchor = '';
  let dominantBaseline = '';

  if (isHorizontal) {
    if (tickAngleNumber > 0) {
      textAnchor = isNegativeTick ? 'end' : 'start';
      dominantBaseline = 'middle';
      transform = `rotate(${tickAngleNumber}, 0, ${anchorPoint})`;
    } else if (tickAngleNumber < 0) {
      textAnchor = isNegativeTick ? 'start' : 'end';
      dominantBaseline = 'middle';
      transform = `rotate(${tickAngleNumber}, 0, ${anchorPoint})`;
    } else {
      // tickAngleNumber === 0
      textAnchor = 'middle';
      dominantBaseline = isNegativeTick ? 'alphabetic' : 'hanging';
    }
  } else if (!isHorizontal) {
    if (tickAngleNumber === 90) {
      textAnchor = 'middle';
      dominantBaseline = isNegativeTick ? 'hanging' : 'alphabetic';
      transform = `rotate(90, ${anchorPoint}, 0)`;
    } else if (tickAngleNumber === -90) {
      textAnchor = 'middle';
      dominantBaseline = isNegativeTick ? 'alphabetic' : 'hanging';
      transform = `rotate(-90, ${anchorPoint}, 0)`;
    } else if (tickAngleNumber !== 0) {
      textAnchor = isNegativeTick ? 'end' : 'start';
      dominantBaseline = 'middle';
      transform = `rotate(${tickAngleNumber}, ${anchorPoint}, 0)`;
    } else {
      // tickAngleNumber === 0
      textAnchor = isNegativeTick ? 'end' : 'start';
      dominantBaseline = 'middle';
    }
  }
  return { transform, textAnchor, dominantBaseline };
}

export function getTitleProps({ isHorizontal, titleJustify, titleDimensions, barLength }) {
  let transform = '';
  let textAnchor = '';
  let dominantBaseline = '';
  let x = 0;
  let y = 0;

  if (isHorizontal) {
    if (titleJustify === 'left') {
      x = 0;
      textAnchor = 'start';
    } else if (titleJustify === 'center') {
      x = barLength / 2;
      textAnchor = 'middle';
    } else if (titleJustify === 'right') {
      x = barLength;
      textAnchor = 'end';
    }
    y = titleDimensions.height / 2;
    dominantBaseline = 'central';
  } else if (!isHorizontal) {
    if (titleJustify === 'left') {
      y = barLength;
      textAnchor = 'start';
    } else if (titleJustify === 'center') {
      y = barLength / 2;
      textAnchor = 'middle';
    } else if (titleJustify === 'right') {
      y = 0;
      textAnchor = 'end';
    }
    x = titleDimensions.width / 2;
    dominantBaseline = 'central';
    transform = `rotate(-90, ${x}, ${y})`;
  }

  return { transform, textAnchor, dominantBaseline, x, y };
}
