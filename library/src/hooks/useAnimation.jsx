import { useEffect } from 'react';
import { useChartHelpers } from './useChartHelpers';

function useAnimation({ type, ref, trigger, duration }) {
  const { chartValues, scalesReady } = useChartHelpers();
  const animationDuration = duration || chartValues.animationDuration;

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    // small delay to allow any late layout changes to settle before starting
    // the animation setup when scalesReady is true
    const startDelay = 0;
    let startTimeout = null;
    let rafId = null;

    const clearRaf = () => {
      if (rafId) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
    };

    const startFadeIn = () => {
      element.style.animation = 'none';
      element.getBoundingClientRect();
      element.style.animation = `fadeIn ${animationDuration}ms forwards`;
    };

    const startDrawLine = () => {
      const setupAnimation = () => {
        const length = element.getTotalLength();
        if (!length) {
          rafId = requestAnimationFrame(setupAnimation);
          return;
        }

        element.style.strokeDasharray = length;
        element.style.strokeDashoffset = length;

        element.style.animation = 'none';
        element.getBoundingClientRect();
        element.style.animation = `drawLine ${animationDuration}ms forwards`;

        const handleAnimationEnd = () => {
          element.style.strokeDasharray = '';
          element.style.strokeDashoffset = '';
          element.removeEventListener('animationend', handleAnimationEnd);
        };
        element.addEventListener('animationend', handleAnimationEnd);
      };
      setupAnimation();
    };

    const startGrowBar = () => {
      const rects = element.querySelectorAll('rect');
      rects.forEach((rect) => {
        rect.style.animation = 'none';
        rect.style.transform = 'scaleY(0)';
        rect.style.transformOrigin =
          rect.style.transformOrigin || 'center bottom';
      });
      element.getBoundingClientRect();
      requestAnimationFrame(() => {
        rects.forEach((rect) => {
          rect.style.animation = `growBar ${animationDuration}ms forwards`;
          rect.style.transform = 'scaleY(1)';
        });
      });
    };

    if (scalesReady) {
      switch (type) {
        case 'fadeIn':
          startTimeout = setTimeout(startFadeIn, startDelay);
          break;
        case 'drawLine':
          startTimeout = setTimeout(startDrawLine, startDelay);
          break;
        case 'growBar':
          startTimeout = setTimeout(startGrowBar, startDelay);
          break;
        default:
          break;
      }
    }

    return () => {
      if (startTimeout) clearTimeout(startTimeout);
      clearRaf();
    };
  }, [animationDuration, ref, trigger, type, scalesReady]);
}

export default useAnimation;
