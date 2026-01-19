import React from 'react';
import { BorderBeam } from './BorderBeam';

interface AIGlowContainerProps {
    children: React.ReactNode;
    /** Whether the AI generation/refining effect is active */
    isActive: boolean;
    /** Optional custom class for the container */
    className?: string;
    /** Border beam animation duration (seconds) */
    duration?: number;
    /** Start color of the beam */
    colorFrom?: string;
    /** End color of the beam */
    colorTo?: string;
}

export const AIGlowContainer: React.FC<AIGlowContainerProps> = ({
    children,
    isActive,
    className = "",
    duration = 3,
    colorFrom = "#06b6d4",
    colorTo = "#3b82f6"
}) => {
    return (
        <div className={`relative transition-all rounded-xl ${isActive ? 'p-[3px]' : ''} ${className}`}>
            {isActive && (
                <BorderBeam
                    duration={duration}
                    colorFrom={colorFrom}
                    colorTo={colorTo}
                    className="z-20"
                />
            )}
            {/* 
              Note: Children should ideally have 'w-full h-full' and handle their own 
              internal border removal if needed when isActive is true, 
              though the beam will technically overlay the border area if not padded.
              With p-[3px], the child sits inside.
            */}
            {children}
        </div>
    );
};
