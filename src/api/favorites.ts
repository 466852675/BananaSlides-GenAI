import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { client } from './client';
import { StylePreset, StyleConfig, GlobalStyleMap } from '../types';
import { getAuthToken } from '../utils/auth';

export interface FavoriteDTO {
    id: string;
    templateId?: string;
    name: string;
    config: any;
    styleMap?: any;
    sampleImages?: any;
    createdAt: string;
    updatedAt: string;
    template?: {
        name: string;
        config: any;
        styleMap?: any;
        createdAt: string;
        updatedAt: string;
    };
}

const transformFavorite = (dto: FavoriteDTO): StylePreset => {
    // 优先使用关联模版的数据（实现实时同步），如果没有关联模版则使用收藏时的快照数据
    const sourceName = dto.template?.name || dto.name;
    const sourceConfig = dto.template?.config || dto.config;
    const sourceStyleMap = dto.template?.styleMap || dto.styleMap;

    return {
        id: dto.id,
        templateId: dto.templateId,
        name: sourceName,
        config: (typeof sourceConfig === 'string' ? JSON.parse(sourceConfig) : sourceConfig) as StyleConfig,
        styleMap: sourceStyleMap ? (typeof sourceStyleMap === 'string' ? JSON.parse(sourceStyleMap) : sourceStyleMap) as GlobalStyleMap : undefined,
        sampleImages: dto.sampleImages ? (Array.isArray(dto.sampleImages) ? dto.sampleImages : JSON.parse(dto.sampleImages)) : [],
        createdAt: new Date(dto.createdAt).getTime(),
        templateCreatedAt: dto.template?.createdAt ? new Date(dto.template.createdAt).getTime() : undefined,
        templateUpdatedAt: dto.template?.updatedAt ? new Date(dto.template.updatedAt).getTime() : undefined
    };
};

export const useFavorites = () => {
    return useQuery({
        queryKey: ['favorites'],
        queryFn: async () => {
            const res = await client.get('/favorites');
            return (res as unknown as FavoriteDTO[]).map(transformFavorite);
        },
        enabled: Boolean(getAuthToken()),
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
