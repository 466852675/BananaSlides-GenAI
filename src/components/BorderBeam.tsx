import React from "react";

interface BorderBeamProps {
    duration?: number;
    borderWidth?: number;
    colorFrom?: string;
    colorTo?: string;
    delay?: number;
    className?: string;
}

export const BorderBeam = ({
    duration = 8, // Slower default for elegance
    borderWidth = 3,
    colorFrom = "#a855f7", // Purple
    colorTo = "#06b6d4",   // Cyan
    delay = 0,
    className = "",
}: BorderBeamProps) => {
    return (
        <div className={`absolute inset-0 pointer-events-none rounded-[inherit] overflow-hidden z-10 ${className}`}>
            <svg
                className="w-full h-full"
                width="100%"
                height="100%"
                xmlns="http://www.w3.org/2000/svg"
            >
                <defs>
                    {/* Rotating Gradient for "Comet" effect */}
                    <linearGradient id="beam-gradient-animated" gradientUnits="objectBoundingBox" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stopColor={colorFrom} stopOpacity="0" />
                        <stop offset="20%" stopColor={colorFrom} stopOpacity="0.5" />
                        <stop offset="50%" stopColor={colorFrom} />
                        <stop offset="80%" stopColor={colorTo} />
                        <stop offset="100%" stopColor={colorTo} stopOpacity="0" />
                        <animateTransform
                            attributeName="gradientTransform"
                            type="rotate"
                            from="0 .5 .5"
                            to="360 .5 .5"
                            dur={`${duration}s`}
                            repeatCount="indefinite"
                        />
                    </linearGradient>

                    {/* Glow Filter */}
                    <filter id="beam-glow">
                        <feGaussianBlur in="SourceGraphic" stdDeviation="0.5" result="blur" />
                        <feDropShadow dx="0" dy="0" stdDeviation="2" floodColor={colorTo} floodOpacity="0.5" />
                        <feComposite in="SourceGraphic" in2="blur" operator="over" />
                    </filter>
                </defs>

                <rect
                    x="1.5"
                    y="1.5"
                    width="calc(100% - 3px)"
                    height="calc(100% - 3px)"
                    rx="12"
                    ry="12"
                    fill="none"
                    stroke="url(#beam-gradient-animated)"
                    strokeWidth={borderWidth}
                    strokeLinecap="round"
                    filter="url(#beam-glow)"
                    pathLength="100"
                    style={{
                        strokeDasharray: "25 75", // Short beam length (25%) for distinct comet look
                        strokeDashoffset: 0,
                        animation: `border-beam ${duration}s linear infinite`,
                        animationDelay: `${delay}s`,
                    }}
                />
            </svg>
            <style>{`
        @keyframes border-beam {
          100% {
            stroke-dashoffset: -100;
          }
        }
      `}</style>
        </div>
    );
};
