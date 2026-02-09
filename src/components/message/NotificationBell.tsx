// src/components/message/NotificationBell.tsx
// 消息铃铛组件

import React, { useState, useRef, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useUnreadCount } from '../../hooks/useMessages';
import { MessagePanel } from './MessagePanel';

interface NotificationBellProps {
    className?: string;
}

export const NotificationBell: React.FC<NotificationBellProps> = ({ className }) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const { data: unreadData } = useUnreadCount();
    const unreadCount = unreadData?.total || 0;

    // 点击外部关闭
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    return (
        <div ref={containerRef} className={`relative ${className}`}>
            {/* 铃铛按钮 */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`
                    relative p-2 rounded-xl transition-all duration-200
                    ${isOpen
                        ? 'bg-violet-100 text-violet-600'
                        : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
                    }
                `}
            >
                <Bell size={20} />

                {/* 未读数徽标 */}
                {unreadCount > 0 && (
                    <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="
                            absolute -top-1 -right-1 min-w-[18px] h-[18px] 
                            flex items-center justify-center px-1
                            bg-red-500 text-white text-[10px] font-bold 
                            rounded-full shadow-sm
                        "
                    >
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </motion.span>
                )}
            </button>

            {/* 消息面板 */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                        className="absolute right-0 top-full mt-2 z-50"
                    >
                        <MessagePanel onClose={() => setIsOpen(false)} />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default NotificationBell;
