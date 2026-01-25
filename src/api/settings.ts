import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { client } from './client';
import { AppSettings } from '../types';
import { getAuthToken } from '../utils/auth';

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
        enabled: Boolean(getAuthToken()),
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
            const settings = (res as any).data;
            if ((res as any).envPresets) {
                settings.envPresets = (res as any).envPresets;
            }
            return settings;
        },
        enabled: Boolean(getAuthToken()),
        staleTime: 0, // 0 to ensure Refetch on Window Focus (Real-time sync feeling)
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
