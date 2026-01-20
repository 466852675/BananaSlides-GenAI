import React from 'react';

interface MacWindowHeaderProps {
    title?: React.ReactNode;
    className?: string;
}

export const MacWindowHeader: React.FC<MacWindowHeaderProps> = ({ title, className = "" }) => {
    return (
        <div className={`h-8 md:h-10 bg-slate-800/80 backdrop-blur-md flex items-center px-4 gap-2 border-b border-white/10 ${className}`}>
            <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-[#FF5F56] border border-[#E0443E]" />
                <div className="w-3 h-3 rounded-full bg-[#FFBD2E] border border-[#DEA123]" />
                <div className="w-3 h-3 rounded-full bg-[#27C93F] border border-[#1AAB29]" />
            </div>
            <div className="flex-1 flex justify-center">
                {title && (
                    <div className="hidden md:flex items-center gap-2 px-3 py-1 bg-black/20 rounded-lg text-[10px] md:text-xs text-slate-400 font-mono border border-white/5">
                        {title}
                    </div>
                )}
            </div>
        </div>
    );
};
