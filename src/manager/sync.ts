import { InlayManager } from "./inlay";
import { DriveManager } from "./drive";
import { Logger } from "../logger";
import { AuthManager } from "./auth";
import { RisuAPI } from "../api";
import { DELETED_INLAYS } from "../plugin";
import type { InlayData } from "../types";
import { InlayType } from "../types";

export interface SyncReport {
    uploaded: number;
    downloaded: number;
    deleted: number;
    errors: Array<{ id: string; error: string }>;
}

export interface SyncOptions {
    /** Upload local inlays that don't exist in drive */
    upload?: boolean;
    /** Download drive inlays that don't exist locally */
    download?: boolean;
    /** Delete local inlays that don't exist in drive */
    deleteLocal?: boolean;
    /** Delete drive inlays that don't exist locally */
    deleteDrive?: boolean;
}

export interface SyncProgress {
    phase: 'preparing' | 'uploading' | 'downloading' | 'deleting' | 'complete';
    current: number;
    total: number;
    currentFileName: string;
    bytesTransferred: number;
    totalBytes: number;
}

type SyncProgressCallback = (progress: SyncProgress) => void;

export class SyncManager {
    private static isSyncing = false;
    private static cancelRequested = false;
    private static progressCallback: SyncProgressCallback | null = null;
    private static currentProgress: SyncProgress = {
        phase: 'preparing',
        current: 0,
        total: 0,
        currentFileName: '',
        bytesTransferred: 0,
        totalBytes: 0
    };

    /**
     * Set progress callback
     */
    static setProgressCallback(callback: SyncProgressCallback | null): void {
        this.progressCallback = callback;
    }

    /**
     * Get current progress
     */
    static getProgress(): SyncProgress {
        return { ...this.currentProgress };
    }

    /**
     * Update progress and notify callback
     */
    private static updateProgress(progress: Partial<SyncProgress>): void {
        this.currentProgress = { ...this.currentProgress, ...progress };
        if (this.progressCallback) {
            this.progressCallback(this.currentProgress);
        }
    }

    /**
     * Request sync cancellation
     */
    static cancelSync(): void {
        this.cancelRequested = true;
        Logger.log('Sync cancellation requested');
    }

    /**
     * Check if cancellation was requested
     */
    private static checkCancellation(): void {
        if (this.cancelRequested) {
            this.cancelRequested = false;
            throw new Error('Sync cancelled by user');
        }
    }

    /**
     * Get deleted inlays set from storage
     */
    private static getDeletedInlays(): Set<string> {
        try {
            const json = RisuAPI.getArg(DELETED_INLAYS);
            if (!json) return new Set();
            const arr = JSON.parse(String(json)) as string[];
            return new Set(arr);
        } catch (e) {
            Logger.error('Failed to parse deleted inlays:', e);
            return new Set();
        }
    }

    /**
     * Save deleted inlays set to storage
     */
    private static setDeletedInlays(deleted: Set<string>): void {
        try {
            const json = JSON.stringify(Array.from(deleted));
            RisuAPI.setArg(DELETED_INLAYS, json);
        } catch (e) {
            Logger.error('Failed to save deleted inlays:', e);
        }
    }

    /**
     * Add an inlay ID to the deleted set
     */
    static addDeletedInlay(id: string): void {
        const deleted = this.getDeletedInlays();
        deleted.add(id);
        this.setDeletedInlays(deleted);
    }

    /**
     * Remove an inlay ID from the deleted set (when re-added)
     */
    static removeDeletedInlay(id: string): void {
        const deleted = this.getDeletedInlays();
        deleted.delete(id);
        this.setDeletedInlays(deleted);
    }

    /**
     * Clear all deleted inlay tombstones
     */
    static clearDeletedInlays(): void {
        this.setDeletedInlays(new Set());
    }

    /**
     * Sync deleted inlays between local and drive
     * Downloads _deleted.json from drive, merges with local, uploads back
     */
    private static async syncDeletedInlays(): Promise<void> {
        const localDeleted = this.getDeletedInlays();
        
        // Download _deleted.json from drive
        let driveDeleted: Set<string>;
        try {
            const driveData = await DriveManager.downloadInlay('_deleted');
            if (driveData && typeof driveData.data === 'string') {
                // _deleted.json stores the array directly as JSON string
                const arr = JSON.parse(driveData.data) as string[];
                driveDeleted = new Set(arr);
            } else {
                driveDeleted = new Set();
            }
        } catch (e) {
            Logger.warn('No deleted inlays file on drive, using local only');
            driveDeleted = new Set();
        }

        // Merge: union of both sets
        const merged = new Set([...localDeleted, ...driveDeleted]);

        // Save merged set locally
        this.setDeletedInlays(merged);

        // Upload merged set to drive as InlayData
        const mergedArray = Array.from(merged);
        const deletedData: InlayData = {
            name: '_deleted',
            data: JSON.stringify(mergedArray), // Store as JSON string
            ext: 'json',
            type: InlayType.Image, // Dummy type, not used for metadata file
            height: 0,
            width: 0
        };
        await DriveManager.uploadInlay('_deleted', deletedData);

        Logger.log(`Synced deleted inlays: ${merged.size} total tombstones`);
    }

    /**
     * Performs a bidirectional sync between local and drive
     */
    static async sync(options: SyncOptions = {
        upload: true,
        download: true,
        deleteLocal: false,
        deleteDrive: false
    }): Promise<SyncReport> {
        if (this.isSyncing) {
            throw new Error('Sync already in progress');
        }

        if (!AuthManager.isLoggedIn()) {
            throw new Error('User is not logged in');
        }

        this.isSyncing = true;
        const report: SyncReport = {
            uploaded: 0,
            downloaded: 0,
            deleted: 0,
            errors: []
        };

        try {
            this.cancelRequested = false;
            this.updateProgress({ phase: 'preparing', current: 0, total: 0, currentFileName: 'Preparing sync...' });

            // Sync deleted inlays tombstone list
            await this.syncDeletedInlays();
            const deletedSet = this.getDeletedInlays();

            // Get local and drive inlay IDs
            const localIds = await InlayManager.getKeys();
            const allDriveIds = await DriveManager.listInlayIds();
            
            // Filter out _deleted metadata file from drive IDs
            const driveIds = allDriveIds.filter(id => id !== '_deleted');

            Logger.log(`Starting sync. Local: ${localIds.length}, Drive: ${driveIds.length}, Deleted: ${deletedSet.size}`);

            // Apply tombstone deletions
            const localToDelete = localIds.filter(id => deletedSet.has(id));
            const driveToDelete = driveIds.filter(id => deletedSet.has(id));
            const totalDeletes = localToDelete.length + driveToDelete.length;

            if (totalDeletes > 0) {
                this.updateProgress({ phase: 'deleting', current: 0, total: totalDeletes, currentFileName: 'Applying deletions...' });
            }

            // Delete local inlays that are in tombstone set
            let deleteCount = 0;
            for (const id of localToDelete) {
                this.checkCancellation();
                try {
                    await InlayManager.deleteInlay(id);
                    report.deleted++;
                    deleteCount++;
                    this.updateProgress({ current: deleteCount, currentFileName: id });
                    Logger.log(`Deleted local inlay ${id} (tombstone)`);
                } catch (e) {
                    Logger.error(`Failed to delete local inlay ${id}:`, e);
                    report.errors.push({ id, error: String(e) });
                }
            }

            // Delete drive inlays that are in tombstone set
            for (const id of driveToDelete) {
                this.checkCancellation();
                try {
                    await DriveManager.deleteInlay(id);
                    report.deleted++;
                    deleteCount++;
                    this.updateProgress({ current: deleteCount, currentFileName: id });
                    Logger.log(`Deleted drive inlay ${id} (tombstone)`);
                } catch (e) {
                    Logger.error(`Failed to delete drive inlay ${id}:`, e);
                    report.errors.push({ id, error: String(e) });
                }
            }

            // Filter out deleted IDs from sync lists
            const activeLocalIds = localIds.filter(id => !deletedSet.has(id));
            const activeDriveIds = driveIds.filter(id => !deletedSet.has(id));

            // Calculate total operations
            const toUpload = options.upload ? activeLocalIds.filter(id => !activeDriveIds.includes(id)) : [];
            const toDownload = options.download ? activeDriveIds.filter(id => !activeLocalIds.includes(id)) : [];
            const totalOps = toUpload.length + toDownload.length;

            // Upload local inlays that don't exist in drive
            if (options.upload && toUpload.length > 0) {
                this.updateProgress({ phase: 'uploading', total: totalOps, current: 0 });
                Logger.log(`Uploading ${toUpload.length} inlays...`);

                for (let i = 0; i < toUpload.length; i++) {
                    this.checkCancellation();
                    const id = toUpload[i];
                    
                    try {
                        const data = await InlayManager.getInlayData(id);
                        if (data) {
                            this.updateProgress({ current: i + 1, currentFileName: data.name || id });
                            await DriveManager.uploadInlay(id, data);
                            report.uploaded++;
                        }
                    } catch (e) {
                        Logger.error(`Failed to upload inlay ${id}:`, e);
                        report.errors.push({ id, error: String(e) });
                    }
                }
            }

            // Download drive inlays that don't exist locally
            if (options.download && toDownload.length > 0) {
                this.updateProgress({ phase: 'downloading', current: 0, total: toDownload.length });
                Logger.log(`Downloading ${toDownload.length} inlays...`);

                for (let i = 0; i < toDownload.length; i++) {
                    this.checkCancellation();
                    const id = toDownload[i];
                    
                    try {
                        this.updateProgress({ current: i + 1, currentFileName: id });
                        const data = await DriveManager.downloadInlay(id);
                        if (data) {
                            await InlayManager.setInlayData(id, data);
                            report.downloaded++;
                        }
                    } catch (e) {
                        Logger.error(`Failed to download inlay ${id}:`, e);
                        report.errors.push({ id, error: String(e) });
                    }
                }
            }

            // Delete local inlays that don't exist in drive
            if (options.deleteLocal) {
                const toDeleteLocal = localIds.filter(id => !driveIds.includes(id));
                Logger.log(`Deleting ${toDeleteLocal.length} local inlays...`);

                for (const id of toDeleteLocal) {
                    try {
                        await InlayManager.deleteInlay(id);
                        report.deleted++;
                    } catch (e) {
                        Logger.error(`Failed to delete local inlay ${id}:`, e);
                        report.errors.push({ id, error: String(e) });
                    }
                }
            }

            // Delete drive inlays that don't exist locally
            if (options.deleteDrive) {
                const toDeleteDrive = driveIds.filter(id => !localIds.includes(id));
                Logger.log(`Deleting ${toDeleteDrive.length} drive inlays...`);

                for (const id of toDeleteDrive) {
                    try {
                        await DriveManager.deleteInlay(id);
                        report.deleted++;
                    } catch (e) {
                        Logger.error(`Failed to delete drive inlay ${id}:`, e);
                        report.errors.push({ id, error: String(e) });
                    }
                }
            }

            this.updateProgress({ phase: 'complete', current: totalOps, total: totalOps, currentFileName: 'Sync complete' });
            Logger.log('Sync complete:', report);
            return report;
        } finally {
            this.isSyncing = false;
        }
    }

    /**
     * Push all local inlays to drive (backup)
     */
    static async pushToCloud(): Promise<SyncReport> {
        return await this.sync({
            upload: true,
            download: false,
            deleteLocal: false,
            deleteDrive: false
        });
    }

    /**
     * Pull all drive inlays to local (restore)
     */
    static async pullFromCloud(): Promise<SyncReport> {
        return await this.sync({
            upload: false,
            download: true,
            deleteLocal: false,
            deleteDrive: false
        });
    }

    /**
     * Full bidirectional sync (merge)
     */
    static async mergeSync(): Promise<SyncReport> {
        return await this.sync({
            upload: true,
            download: true,
            deleteLocal: false,
            deleteDrive: false
        });
    }

    /**
     * Check if sync is currently in progress
     */
    static isSyncInProgress(): boolean {
        return this.isSyncing;
    }
}
