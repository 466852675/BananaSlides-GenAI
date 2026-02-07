import React from 'react';
import { Lightbulb } from 'lucide-react';

interface RefundSuggestionProps {
    suggestion: string;
}

export const RefundSuggestion: React.FC<RefundSuggestionProps> = ({ suggestion }) => {
    return (
        <div className="bg-gradient-to-r from-violet-50 to-indigo-50 rounded-xl p-4 border border-violet-100">
            <div className="flex items-center gap-2 mb-2">
                <Lightbulb size={16} className="text-violet-500" />
                <span className="font-bold text-violet-700 text-sm">决策建议</span>
            </div>
            <p className="text-sm text-violet-600">{suggestion}</p>
        </div>
    );
};
