import { AuthManager } from "./auth";
import { SyncManager } from "./sync";
import { RisuAPI } from "../api";
import { SYNC_ENABLED } from "../plugin";
import { Logger } from "../logger";

/**
 * Auto sync manager - runs in background when enabled
 */
export class AutoSyncManager {
    private static instance: AutoSyncManager | null = null;
    private intervalId: number | null = null;
    private readonly SYNC_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

    private constructor() {}

    static getInstance(): AutoSyncManager {
        if (!this.instance) {
            this.instance = new AutoSyncManager();
        }
        return this.instance;
    }

    /**
     * Initialize auto sync based on current settings
     */
    init(): void {
        const syncEnabled = (RisuAPI.getArg(SYNC_ENABLED) as number) === 1;
        const isLoggedIn = AuthManager.isLoggedIn();

        if (syncEnabled && isLoggedIn) {
            this.start();
        }
    }

    /**
     * Start auto sync interval
     */
    start(): void {
        if (this.intervalId !== null) {
            Logger.log('Auto sync already running');
            return;
        }

        const isLoggedIn = AuthManager.isLoggedIn();
        if (!isLoggedIn) {
            Logger.warn('Cannot start auto sync: Not logged in');
            return;
        }

        this.intervalId = window.setInterval(async () => {
            await this.runSync();
        }, this.SYNC_INTERVAL_MS);

        Logger.log(`Auto sync started: Will sync every ${this.SYNC_INTERVAL_MS / 1000 / 60} minutes`);
    }

    /**
     * Stop auto sync interval
     */
    stop(): void {
        if (this.intervalId !== null) {
            clearInterval(this.intervalId);
            this.intervalId = null;
            Logger.log('Auto sync stopped');
        }
    }

    /**
     * Check if auto sync is running
     */
    isRunning(): boolean {
        return this.intervalId !== null;
    }

    /**
     * Run a single sync cycle (called by interval)
     */
    private async runSync(): Promise<void> {
        const syncEnabled = (RisuAPI.getArg(SYNC_ENABLED) as number) === 1;
        const isLoggedIn = AuthManager.isLoggedIn();

        // Stop if conditions are no longer met
        if (!syncEnabled || !isLoggedIn) {
            this.stop();
            return;
        }

        try {
            Logger.log('Auto sync: Starting merge sync...');
            const report = await SyncManager.mergeSync();
            Logger.log(`Auto sync complete: Uploaded ${report.uploaded}, Downloaded ${report.downloaded}`);

            if (report.errors.length > 0) {
                Logger.warn('Auto sync had errors:', report.errors);
            }
        } catch (e) {
            // Silently log errors for auto sync (don't show alert)
            if (e instanceof Error && e.message === 'Sync already in progress') {
                Logger.log('Auto sync skipped: Sync already in progress');
            } else {
                Logger.error('Auto sync failed:', e);
            }
        }
    }

    /**
     * Cleanup on plugin unload
     */
    destroy(): void {
        this.stop();
    }
}
