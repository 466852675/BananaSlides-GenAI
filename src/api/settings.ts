import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { client } from './client';
import { AppSettings } from '../types';

// Fetch FULL settings (for backend sync, contains complete API keys)
// WARNING: Do not use this for UI display - use useAppSettingsMasked instead
export const useAppSettings = () => {
    return useQuery({
        queryKey: ['settings'],
        queryFn: async () => {
            const res = await client.get('/settings');
            // @ts-ignore
            return res.data;
        },
        staleTime: Infinity,
    });
};

// Fetch MASKED settings (for UI display, API keys are hidden)
// Use this when rendering settings in the frontend
export const useAppSettingsMasked = () => {
    return useQuery({
        queryKey: ['settings-masked'],
        queryFn: async () => {
            const res = await client.get('/settings/masked');
            // @ts-ignore
            return res.data;
        },
        staleTime: 1000 * 60 * 5, // 5 minutes
    });
};

// Reset settings to Environment defaults
export const useResetSettings = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async () => {
            await client.post('/settings/reset');
        },
        onSuccess: () => {
             queryClient.invalidateQueries({ queryKey: ['settings'] });
             queryClient.invalidateQueries({ queryKey: ['settings-masked'] });
        }
    });
};

export const useUpdateAppSettings = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (config: AppSettings) => {
            await client.post('/settings', { config });
        },
        onSuccess: () => {
             queryClient.invalidateQueries({ queryKey: ['settings'] });
             queryClient.invalidateQueries({ queryKey: ['settings-masked'] });
        }
    });
};
