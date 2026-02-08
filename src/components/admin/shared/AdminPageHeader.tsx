import React from 'react';

interface AdminPageHeaderProps {
    icon: React.ReactNode;
    title: string;
    description: string;
    gradient?: string;
    shadowColor?: string;
    actions?: React.ReactNode;
    extraInfo?: React.ReactNode;
}

export const AdminPageHeader: React.FC<AdminPageHeaderProps> = ({
    icon,
    title,
    description,
    gradient = 'from-violet-600 to-indigo-600',
    shadowColor = 'shadow-violet-500/20',
    actions,
    extraInfo
}) => {
    return (
        <div className={`relative rounded-3xl overflow-hidden bg-gradient-to-r ${gradient} p-6 shadow-xl ${shadowColor} w-full shrink-0 animate-in fade-in slide-in-from-top-4 duration-700`}>
            <div className="absolute top-0 right-0 w-80 h-80 bg-white/20 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20 mix-blend-overlay" />
            <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-6">
                    <div className="p-2.5 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 text-white shrink-0">
                        {React.cloneElement(icon as any, { size: 24 })}
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-white tracking-tight mb-1">{title}</h1>
                        <p className="text-white/80 text-sm font-medium opacity-90 whitespace-nowrap">{description}</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    {extraInfo && (
                        <div className="hidden md:block px-3 py-1 bg-white/10 backdrop-blur-md rounded-xl border border-white/10 text-[10px] font-mono text-white/70">
                            {extraInfo}
                        </div>
                    )}
                    {actions}
                </div>
            </div>
        </div>
    );
};
