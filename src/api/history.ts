import { client } from './client';
import { ProjectSession, AppSettings } from '../types';

export interface ProjectSnapshot {
    id: string;
    version: number;
    summary: string | null;
    createdAt: string;
    data: string; // JSON string
}

export const useHistory = () => {
    
    // Create new snapshot
    const createSnapshot = async (projectId: string, projectData: ProjectSession, settings: AppSettings) => {
        return client.post<ProjectSnapshot>(`/projects/${projectId}/snapshots`, { projectData, settings }) as unknown as ProjectSnapshot;
    };

    // List snapshots (summary only usually, but type has data)
    const listSnapshots = async (projectId: string) => {
        return client.get<ProjectSnapshot[]>(`/projects/${projectId}/snapshots`) as unknown as ProjectSnapshot[];
    };

    // Get single snapshot full data
    const getSnapshot = async (snapshotId: string) => {
        return client.get<ProjectSnapshot>(`/snapshots/${snapshotId}`) as unknown as ProjectSnapshot;
    };

    // Restore snapshot (Overwrites current project)
    const restoreSnapshot = async (snapshotId: string) => {
        return client.post(`/snapshots/${snapshotId}/restore`, {});
    };

    // Delete snapshot
    const deleteSnapshot = async (snapshotId: string) => {
        return client.delete(`/snapshots/${snapshotId}`);
    };

    return {
        createSnapshot,
        listSnapshots,
        getSnapshot,
        restoreSnapshot,
        deleteSnapshot
    };
};
