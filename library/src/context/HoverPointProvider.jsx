/* eslint-disable react-refresh/only-export-components */
import { createContext, useState, useCallback } from 'react';

/**
 * This provider is used to track the mouse position when hovering over the chart.
 * Attempting to reduce unnecessary re-renders by separating the context into two:
 * one for reading the hover point and one for updating the hover point.
 */

// Separate contexts for reading and updating
export const HoverPointContext = createContext();
export const HoverUpdateContext = createContext();

export function HoverPointProvider({ children }) {
    const [hoverPoint, setHoverPoint] = useState([0, 0]);

    const updateHoverPoint = useCallback((point) => {
        setHoverPoint(point);
    }, []);

    return (
        <HoverPointContext.Provider value={hoverPoint}>
            <HoverUpdateContext.Provider value={updateHoverPoint}>
                {children}
            </HoverUpdateContext.Provider>
        </HoverPointContext.Provider>
    );
}
