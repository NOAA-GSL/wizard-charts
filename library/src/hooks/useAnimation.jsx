import { useLayoutEffect } from 'react';
import { useChartHelpers } from './useChartHelpers';

function useAnimation({ type, ref, trigger, duration }) {
  const { chartValues } = useChartHelpers();
  const animationDuration = duration || chartValues.options.animationDuration;

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;

    switch (type) {
      case 'fadeIn':
        element.style.animation = 'none';
        element.getBoundingClientRect();
        element.style.animation = `fadeIn ${animationDuration}ms forwards`;
        break;
      case 'drawLine': {
        const length = element.getTotalLength();
        element.style.strokeDasharray = length;
        element.style.strokeDashoffset = length;

        // the following two lines are required to restart the animation
        // when the data changes
        element.style.animation = 'none';
        element.getBoundingClientRect();
        element.style.animation = `drawLine ${animationDuration}ms forwards`;

        // clean up after animation so resizing doesn't cause glitches in line length
        const handleAnimationEnd = () => {
          element.style.strokeDasharray = '';
          element.style.strokeDashoffset = '';
          element.removeEventListener('animationend', handleAnimationEnd);
        };
        element.addEventListener('animationend', handleAnimationEnd);
        break;
      }
      case 'growBar': {
        const rects = element.querySelectorAll('rect');
        rects.forEach((rect) => {
          rect.style.animation = 'none';
          rect.style.transform = 'scaleY(0)';
          rect.style.transformOrigin =
            rect.style.transformOrigin || 'center bottom';
        });
        // Force reflow
        element.getBoundingClientRect();
        // Trigger animation in the next frame
        requestAnimationFrame(() => {
          rects.forEach((rect) => {
            rect.style.animation = `growBar ${animationDuration}ms forwards`;
            rect.style.transform = 'scaleY(1)';
          });
        });
        break;
      }
      default:
        break;
    }
  }, [animationDuration, ref, trigger, type]);
}

export default useAnimation;
