import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { client } from './client';
import { ProjectSession, ProjectStatus, GeneratedSlide, StoredResource } from '../types';
import { ensureUploaded, serializeStyleMap } from '../utils/resourceHelper';

// Types matching backend DTOs
export interface ProjectDTO {
    id: string;
    title: string;
    displayId?: string;
    status: ProjectStatus;
    globalConfig?: string; // JSON string
    styleMap?: string;     // JSON string
    items: SlideDTO[];
    createdAt: string;
    updatedAt: string;
    thumbnailUrl?: string;
    isPinned: boolean;
}

export interface SlideDTO {
    id: string;
    projectId: string;
    index: number;
    pageType: string;
    contentType: string;
    title: string;
    content: string;
    brief: string | null;
    variants: string; // JSON string
    originalFileRef: string | null; // JSON string
    previewUrl: string | null;
    variantCount: number;
    status: string;
    createdAt: string;
}

// Helper: Smart thumbnail selection
// Priority: workbench slides (cover > directory > transition > content > end)
// Fallback: styleMap reference images (same order)
const calculateThumbnail = (items: any[], styleMap: any): string | undefined => {
    const pageTypePriority: Array<'cover' | 'directory' | 'transition' | 'content' | 'end'> = 
        ['cover', 'directory', 'transition', 'content', 'end'];
    
    // Try to find first successful slide with image in priority order
    for (const pageType of pageTypePriority) {
        const slide = items.find(item => 
            item.pageType === pageType && 
            item.status === 'success' && 
            item.variants && 
            item.variants.length > 0
        );
        if (slide) {
            return slide.variants[0];
        }
    }
    
    // Fallback to styleMap reference images
    if (styleMap) {
        for (const pageType of pageTypePriority) {
            if (styleMap[pageType]) {
                return styleMap[pageType];
            }
        }
    }
    
    return undefined;
};

// Transform DTO to Frontend Type
// Note: We need to be careful with JSON parsing
const transformProject = (dto: ProjectDTO): ProjectSession => {
    console.log('[transformProject] Raw DTO:', dto);
    console.log('[transformProject] DTO.items count:', dto.items?.length || 0);
    console.log('[transformProject] DTO.globalConfig type:', typeof dto.globalConfig);
    console.log('[transformProject] DTO.styleMap type:', typeof dto.styleMap);
    
    // Prisma might auto-parse JSON fields, so check type first
    let globalConfig;
    if (typeof dto.globalConfig === 'object' && dto.globalConfig !== null) {
        globalConfig = dto.globalConfig;  // Already parsed
    } else {
        try {
            globalConfig = dto.globalConfig ? JSON.parse(dto.globalConfig as string) : {};
        } catch { globalConfig = {} }
    }
    
    let globalStyleMap;
    if (typeof dto.styleMap === 'object' && dto.styleMap !== null) {
        globalStyleMap = dto.styleMap;  // Already parsed
    } else {
        try {
            globalStyleMap = dto.styleMap ? JSON.parse(dto.styleMap as string) : {};
        } catch { globalStyleMap = {} }
    }

    const transformedItems = (dto.items || []).map(slide => {
             let variants = [];
             try { variants = JSON.parse(slide.variants); } catch {}
             
             // originalFileRef might be object or string or null
             // Backend stores string (JSON). Frontend expects StoredResource (File | string)
             // But 'File' is impossible from backend. So it will be string (URL) or null.
             // Wait, logic says originalFileRef is JSON string.
             // If it stores a URL directly? 
             // Let's assume for now it's null or a URL string.
             let originalFile = null;
             if (slide.originalFileRef) {
                 try {
                     originalFile = JSON.parse(slide.originalFileRef); // "http://..."
                 } catch {
                     originalFile = slide.originalFileRef;
                 }
             }

             return {
                 id: slide.id,
                 projectId: slide.projectId,
                 contentType: slide.contentType as 'image'|'text',
                 pageType: slide.pageType as any,
                 originalFile, // string | null
                 title: slide.title,
                 textContent: slide.content, // Map content -> textContent
                 // Priority for left-side display: 
                 // 1. Database previewUrl (user's original upload)
                 // 2. originalFile (also user's upload)
                 // 3. Empty string (no image on left side if nothing uploaded)
                 // DO NOT use variants[0] here - that's the generated image for right side
                 previewUrl: slide.previewUrl || (slide.contentType === 'image' && originalFile ? originalFile : ''),
                 variants,
                 variantCount: slide.variantCount || 2, // Use database value, not variants.length
                 // Reset 'generating' status to 'idle' on load.
                 // This prevents "Stuck in AI Design" if the user refreshed during generation.
                 status: slide.status === 'generating' ? 'idle' : slide.status as any,
                 createdAt: new Date(slide.createdAt).getTime(),
             }
        });

    // Calculate progress dynamically
    const targetPageCount = globalConfig?.targetPageCount || Math.max(transformedItems.length, 1);
    const completedCount = transformedItems.filter(i => i.status === 'success').length;
    let progress = 0;
    if (targetPageCount > 0) {
        progress = Math.min(Math.round((completedCount / targetPageCount) * 100), 100);
    }

    // Determine effective status
    let effectiveStatus = dto.status;
    
    // 1. If any item is generating, the project is generating
    if (transformedItems.some(i => i.status === 'generating')) {
        effectiveStatus = 'generating';
    } 
    // 2. If finished (all targets completed), mark as completed
    else if (completedCount >= targetPageCount && targetPageCount > 0) {
        effectiveStatus = 'completed';
    }
    // 3. If no items, it's strictly 'idle' (Not Started)
    // 4. If items exist but not generating and not completed, it corresponds to 'In Progress' 
    //    (which technically maps to 'idle' or 'paused' in DB, handled by UI)

    return {
        id: dto.id,
        title: dto.title,
        displayId: dto.displayId,
        status: effectiveStatus,
        createdAt: new Date(dto.createdAt).getTime(),
        lastModified: new Date(dto.updatedAt).getTime(),
        isPinned: dto.isPinned,
        methods: [], 
        progress,
        globalConfig,
        globalStyleMap,
        items: transformedItems,
        thumbnailUrl: calculateThumbnail(transformedItems, globalStyleMap),
    };
};

export const useProjects = () => {
    return useQuery({
        queryKey: ['projects'],
        queryFn: async () => {
             try {
                 console.log('[useProjects] Fetching projects from API...');
                 const dtos = await client.get<ProjectDTO[]>('/projects');
                 console.log('[useProjects] Raw DTOs received:', dtos);
                 // @ts-ignore
                 const projects = dtos.map(transformProject);
                 console.log('[useProjects] Fetched projects count:', projects.length);
                 console.log('[useProjects] Projects:', projects);
                 return projects;
             } catch (error) {
                 console.error('[useProjects] Error fetching projects:', error);
                 throw error;
             }
        }
    });
};

export const useProject = (id: string) => {
    return useQuery({
        queryKey: ['project', id],
        queryFn: async () => {
            const dto = await client.get<ProjectDTO>(`/projects/${id}`);
            // @ts-ignore
            return transformProject(dto);
        },
        enabled: !!id
    });
};

export const useCreateProject = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (data: Partial<ProjectSession>) => {
            console.log('[useCreateProject] Mutation starting with data:', data);
            // Convert Frontend -> Backend DTO
            const payload = {
                title: data.title || 'Untitled',
                status: data.status,
                globalConfig: JSON.stringify(data.globalConfig || {}),
                styleMap: JSON.stringify(data.globalStyleMap || {}),
                isPinned: data.isPinned || false,
                // Items creation is separate usually? Or nested?
                // For 'create', maybe just empty items.
                // Our backend supports creating with no items.
            };
            // client.post returns data directly due to interceptor
            const result = await client.post('/projects', payload) as unknown as ProjectDTO;
            console.log('[useCreateProject] Mutation result:', result);
            return result;
        },
        onSuccess: (data) => {
            console.log('[useCreateProject] onSuccess called, invalidating projects query');
            console.log('[useCreateProject] Created project data:', data);
            queryClient.invalidateQueries({ queryKey: ['projects'] });
        },
        onError: (error) => {
            console.error('[useCreateProject] Mutation failed:', error);
        }
    });
};

export const useDeleteProject = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (id: string) => {
            return client.delete(`/projects/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['projects'] });
        }
    });
};

export const useUpdateProject = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, data }: { id: string; data: Partial<ProjectSession> }) => {
            const payload: any = {};
            if (data.title) payload.title = data.title;
            if (data.status) payload.status = data.status;
            if (data.isPinned !== undefined) payload.isPinned = data.isPinned;
            if (data.globalConfig) payload.globalConfig = JSON.stringify(data.globalConfig);
            if (data.globalConfig) payload.globalConfig = JSON.stringify(data.globalConfig);
            if (data.globalStyleMap) {
                // Ensure any File objects are uploaded before saving
                const serializedMap = await serializeStyleMap(data.globalStyleMap);
                payload.styleMap = JSON.stringify(serializedMap);
            }
            
            // Backend update doesn't support nested items update yet via 'project patch'
            // We might need a separate call for items or handle it in backend.
            // For now, let's assume metadata update.
            return client.patch(`/projects/${id}`, payload);
        },
        onSuccess: (data, variables) => {
            queryClient.invalidateQueries({ queryKey: ['projects'] });
            queryClient.invalidateQueries({ queryKey: ['project', variables.id] });
        }
    });
};

export const useSyncProjectSlides = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ projectId, slides }: { projectId: string; slides: GeneratedSlide[] }) => {
            console.log('[useSyncProjectSlides] Syncing', slides.length, 'slides for project', projectId);
            const slidesDebug = slides.map(s => ({
                id: s.id,
                contentType: s.contentType,
                previewUrl: s.previewUrl,
                variants: s.variants,
                originalFile: typeof s.originalFile === 'string' ? s.originalFile : 'File object'
            }));
            console.log('[useSyncProjectSlides] Slides data (JSON):', JSON.stringify(slidesDebug, null, 2));
            // Ensure all originalFiles are uploaded
            const processedSlides = await Promise.all(slides.map(async (s) => {
                if (s.originalFile instanceof File) {
                    const url = await ensureUploaded(s.originalFile);
                    // Also update previewUrl to the real URL, effectively replacing any temporary blob: URL
                    return { ...s, originalFile: url, previewUrl: url };
                }
                return s;
            }));

            const response = await client.patch(`/projects/${projectId}/slides`, { slides: processedSlides }) as any;
            console.log('[useSyncProjectSlides] Response:', response);
            if (response.items) {
                console.log('[useSyncProjectSlides] Response items (JSON):', JSON.stringify(response.items.map((item: any) => ({
                    id: item.id,
                    contentType: item.contentType,
                    variants: item.variants,
                    content: item.content
                })), null, 2));
            }
            return response;
        },
        onSuccess: (data: any, variables) => {
            console.log('[useSyncProjectSlides] Sync successful, response data:', data);
            console.log('[useSyncProjectSlides] Response has items:', data?.items?.length || 0);
            queryClient.invalidateQueries({ queryKey: ['projects'] });
            queryClient.invalidateQueries({ queryKey: ['project', variables.projectId] });
        },
        onError: (error) => {
            console.error('[useSyncProjectSlides] Sync failed:', error);
        }
    });
};
