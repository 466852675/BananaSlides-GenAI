import React from 'react';

export interface DatePickerProps {
    value?: Date | null;
    onChange: (date: Date | null) => void;
    placeholder?: string;
    disabled?: boolean;
    className?: string;
}

export const DatePicker: React.FC<DatePickerProps> = ({
    value,
    onChange,
    placeholder = '选择日期',
    disabled = false,
    className = ''
}) => {
    const formatDate = (date: Date): string => {
        return date.toISOString().split('T')[0];
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const dateStr = e.target.value;
        if (dateStr) {
            onChange(new Date(dateStr));
        } else {
            onChange(null);
        }
    };

    return (
        <input
            type="date"
            value={value ? formatDate(value) : ''}
            onChange={handleChange}
            disabled={disabled}
            placeholder={placeholder}
            className={`
                block w-full px-3 py-2 
                border border-gray-300 rounded-md 
                shadow-sm text-sm
                focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                disabled:bg-gray-100 disabled:text-gray-500
                ${className}
            `}
        />
    );
};

export interface DateRangePickerProps {
    startDate?: Date | null;
    endDate?: Date | null;
    onStartDateChange: (date: Date | null) => void;
    onEndDateChange: (date: Date | null) => void;
    disabled?: boolean;
    className?: string;
}

export const DateRangePicker: React.FC<DateRangePickerProps> = ({
    startDate,
    endDate,
    onStartDateChange,
    onEndDateChange,
    disabled = false,
    className = ''
}) => {
    return (
        <div className={`flex items-center space-x-2 ${className}`}>
            <DatePicker
                value={startDate}
                onChange={onStartDateChange}
                placeholder="开始日期"
                disabled={disabled}
            />
            <span className="text-gray-500">至</span>
            <DatePicker
                value={endDate}
                onChange={onEndDateChange}
                placeholder="结束日期"
                disabled={disabled}
            />
        </div>
    );
};
