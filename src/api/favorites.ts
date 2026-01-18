import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { client } from './client';
import { StylePreset, StyleConfig, GlobalStyleMap } from '../types';

export interface FavoriteDTO {
    id: string;
    templateId?: string;
    name: string;
    config: any;
    styleMap?: any;
    sampleImages?: any;
    createdAt: string;
    updatedAt: string;
}

const transformFavorite = (dto: FavoriteDTO): StylePreset => {
    return {
        id: dto.id,
        templateId: dto.templateId,
        name: dto.name,
        config: (typeof dto.config === 'string' ? JSON.parse(dto.config) : dto.config) as StyleConfig,
        styleMap: dto.styleMap ? (typeof dto.styleMap === 'string' ? JSON.parse(dto.styleMap) : dto.styleMap) as GlobalStyleMap : undefined,
        sampleImages: dto.sampleImages ? (Array.isArray(dto.sampleImages) ? dto.sampleImages : JSON.parse(dto.sampleImages)) : [],
        createdAt: new Date(dto.createdAt).getTime()
    };
};

export const useFavorites = () => {
    return useQuery({
        queryKey: ['favorites'],
        queryFn: async () => {
            const res = await client.get('/favorites');
            return (res as unknown as FavoriteDTO[]).map(transformFavorite);
        },
        staleTime: 1000 * 60 * 5 // 5 minutes
    });
};

export const useAddFavorite = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (preset: Omit<StylePreset, "id" | "createdAt"> & { templateId?: string }) => {
            const res = await client.post('/favorites', preset);
            return transformFavorite(res as any);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['favorites'] });
        }
    });
};

export const useRemoveFavorite = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (id: string) => {
            await client.delete(`/favorites/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['favorites'] });
        }
    });
};
