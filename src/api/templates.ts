import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { client } from './client';
import { StyleTemplate, StyleConfig, GlobalStyleMap } from '../types';

export interface StyleTemplateDTO {
    id: string;
    name: string;
    config: any; // backend sends Object or JSON
    styleMap?: any;
    isCustom: boolean;
    createdAt: string;
    updatedAt: string;
}

const transformTemplate = (dto: StyleTemplateDTO): StyleTemplate => {
    return {
        id: dto.id,
        name: dto.name,
        // Helper to handle mixed parsing states
        config: (typeof dto.config === 'string' ? JSON.parse(dto.config) : dto.config) as StyleConfig,
        styleMap: dto.styleMap ? (typeof dto.styleMap === 'string' ? JSON.parse(dto.styleMap) : dto.styleMap) as GlobalStyleMap : undefined,
        isCustom: dto.isCustom,
        createdAt: new Date(dto.createdAt).getTime()
    };
};

export const useTemplates = () => {
    return useQuery({
        queryKey: ['templates'],
        queryFn: async () => {
            const res = await client.get('/templates');
            return (res as unknown as StyleTemplateDTO[]).map(transformTemplate);
        },
        staleTime: 1000 * 60 * 5 // 5 minutes
    });
};

export const useSaveTemplate = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (template: Omit<StyleTemplate, "id" | "createdAt">) => {
            const res = await client.post('/templates', template);
            return transformTemplate(res as any);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['templates'] });
        }
    });
};

export const useUpdateTemplate = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, updates }: { id: string; updates: Partial<StyleTemplate> }) => {
            const res = await client.patch(`/templates/${id}`, updates);
            return transformTemplate(res as any);
        },
        onSuccess: () => {
             queryClient.invalidateQueries({ queryKey: ['templates'] });
        }
    });
};

export const useDeleteTemplate = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (id: string) => {
            await client.delete(`/templates/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['templates'] });
        }
    });
};
