import { InlayManager } from "./inlay";
import { DriveManager } from "./drive";
import { Logger } from "../logger";
import { AuthManager } from "./auth";

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

export class SyncManager {
    private static isSyncing = false;

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
            // Get local and drive inlay IDs
            const localIds = await InlayManager.getKeys();
            const driveIds = await DriveManager.listInlayIds();

            Logger.log(`Starting sync. Local: ${localIds.length}, Drive: ${driveIds.length}`);

            // Upload local inlays that don't exist in drive
            if (options.upload) {
                const toUpload = localIds.filter(id => !driveIds.includes(id));
                Logger.log(`Uploading ${toUpload.length} inlays...`);

                for (const id of toUpload) {
                    try {
                        const data = await InlayManager.getInlayData(id);
                        if (data) {
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
            if (options.download) {
                const toDownload = driveIds.filter(id => !localIds.includes(id));
                Logger.log(`Downloading ${toDownload.length} inlays...`);

                for (const id of toDownload) {
                    try {
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
