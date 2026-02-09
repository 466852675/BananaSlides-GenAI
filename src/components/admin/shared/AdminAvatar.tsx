import React from 'react';
import { User, LucideIcon } from 'lucide-react';

interface AdminAvatarProps {
    src?: string | null;
    fallback?: string;
    icon?: LucideIcon;
    size?: 'sm' | 'md' | 'lg' | 'xl';
    className?: string;
}

export const AdminAvatar: React.FC<AdminAvatarProps> = ({
    src,
    fallback,
    icon: Icon,
    size = 'md',
    className = ''
}) => {
    const sizeClasses = {
        sm: 'w-8 h-8 text-[10px]',
        md: 'w-10 h-10 text-xs',
        lg: 'w-12 h-12 text-sm',
        xl: 'w-16 h-16 text-base'
    };

    const hashString = (str: string) => {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            hash = str.charCodeAt(i) + ((hash << 5) - hash);
        }
        return hash;
    };

    const getGradient = (str: string) => {
        const hash = hashString(str);
        const hue = Math.abs(hash % 360);
        return `linear-gradient(135deg, hsl(${hue}, 70%, 60%), hsl(${hue + 45}, 70%, 60%))`;
    };

    // 智能提取首字母或首字
    const getInitials = (str: string) => {
        if (!str) return null;
        // 如果是中文，取第一个字
        if (/^[\u4e00-\u9fa5]/.test(str)) {
            return str[0];
        }
        // 否则取前两个单词的首字母，或前两个字符
        const parts = str.trim().split(/\s+/);
        if (parts.length > 1) {
            return (parts[0][0] + parts[1][0]).toUpperCase();
        }
        return str.slice(0, 2).toUpperCase();
    };

    const initials = fallback ? getInitials(fallback) : null;
    const FallbackIcon = Icon || User;

    return (
        <div
            className={`relative rounded-full flex items-center justify-center overflow-hidden shrink-0 border border-white/20 shadow-sm ${sizeClasses[size]} ${className}`}
            style={{
                background: (!src && initials && fallback) ? getGradient(fallback) : undefined
            }}
        >
            {src ? (
                <img
                    src={src}
                    alt={fallback || 'Avatar'}
                    className="w-full h-full object-cover"
                />
            ) : initials ? (
                <span className="font-black text-white drop-shadow-sm select-none">{initials}</span>
            ) : (
                <div className="w-full h-full bg-slate-100 flex items-center justify-center text-slate-400">
                    <FallbackIcon size={size === 'sm' ? 14 : size === 'md' ? 18 : 24} />
                </div>
            )}
        </div>
    );
};
