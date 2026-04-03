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
          rect.style.transformOrigin = rect.style.transformOrigin || '50% 100%';
          rect.style.transformBox = rect.style.transformBox || 'fill-box';
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
      case 'growBox': {
        const rects = element.querySelectorAll('rect');
        rects.forEach((rect) => {
          rect.style.animation = 'none';
          rect.style.transform = 'scaleY(0)';
          rect.style.transformOrigin = rect.style.transformOrigin || '50% 50%';
          rect.style.transformBox = rect.style.transformBox || 'fill-box';
        });
        // Force reflow
        element.getBoundingClientRect();
        // Trigger animation in the next frame
        requestAnimationFrame(() => {
          rects.forEach((rect) => {
            rect.style.animation = `growBox ${animationDuration}ms forwards`;
            rect.style.transform = 'scaleY(1)';
          });
        });
        break;
      }
      case 'growCircle': {
        const circles = element.querySelectorAll('circle');
        circles.forEach((c) => {
          c.style.animation = 'none';
          c.style.transform = 'scale(0)';
          c.style.transformOrigin = c.style.transformOrigin || '50% 50%';
          c.style.transformBox = c.style.transformBox || 'fill-box';
          c.style.opacity = '0';
        });
        // Force reflow
        element.getBoundingClientRect();
        // Trigger animation in the next frame
        requestAnimationFrame(() => {
          circles.forEach((c) => {
            c.style.animation = `growCircle ${animationDuration}ms forwards`;
            c.style.transform = 'scale(1)';
            c.style.opacity = '1';
          });
        });
        break;
      }
      case 'growMedian': {
        const lines = element.querySelectorAll('line');
        lines.forEach((ln) => {
          ln.style.animation = 'none';
          // preserve per-line initial transform (translateY from center)
          ln.style.transformOrigin = ln.style.transformOrigin || '50% 50%';
          ln.style.transformBox = ln.style.transformBox || 'fill-box';
          ln.style.opacity = '0';
        });
        // Force reflow
        element.getBoundingClientRect();
        requestAnimationFrame(() => {
          lines.forEach((ln) => {
            ln.style.animation = `growMedian ${animationDuration}ms forwards`;
          });
        });
        break;
      }
      case 'drawLines': {
        const lines = element.querySelectorAll('line');
        lines.forEach((ln) => {
          try {
            const length = ln.getTotalLength();
            ln.style.strokeDasharray = length;
            ln.style.strokeDashoffset = length;
          } catch (e) {
            // ignore if element doesn't support getTotalLength
            console.error('Element does not support getTotalLength:', ln, e);
          }
          ln.style.animation = 'none';
        });
        // Force reflow
        element.getBoundingClientRect();
        requestAnimationFrame(() => {
          lines.forEach((ln) => {
            ln.style.animation = `drawLine ${animationDuration}ms forwards`;
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
