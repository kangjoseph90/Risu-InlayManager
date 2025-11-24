import localForage from 'localforage';
import { RisuAPI } from '../api';
import { TIME_DB_ARG } from '../plugin';
import { debounce } from '../util';
import { Logger } from '../logger';

const timeDB = localForage.createInstance({
    name: 'inlay',
    storeName: 'time',
});

export class TimeManager {
    private static cachedDB: Record<string, string> = {};
    private static readonly DEBOUNCE_WAIT = 1000;

    private static debouncedSave = debounce(() => {
        RisuAPI.setArg(TIME_DB_ARG, JSON.stringify(TimeManager.cachedDB));
    }, TimeManager.DEBOUNCE_WAIT);

    static async init() {
        try {
            // 1. Load from RisuAPI first
            const storedDB = RisuAPI.getArg(TIME_DB_ARG) as string;
            if (storedDB) {
                this.cachedDB = JSON.parse(storedDB);
            }

            // 2. If empty, try migrating from localForage
            if (Object.keys(this.cachedDB).length === 0) {
                await this.migrateFromLocalForage();
            }
        } catch (e) {
            Logger.error("Failed to init TimeManager:", e);
            // Fallback: try migration if parsing failed
            await this.migrateFromLocalForage();
        }
    }

    private static async migrateFromLocalForage() {
        try {
            const keys = await timeDB.keys();
            if (keys.length === 0) return;

            Logger.log(`Migrating ${keys.length} time records from localForage...`);
            
            await timeDB.iterate<string, void>((value, key) => {
                this.cachedDB[key] = value;
            });

            // Save to RisuAPI immediately
            RisuAPI.setArg(TIME_DB_ARG, JSON.stringify(this.cachedDB));
            
            // Optional: Clear localForage after successful migration
            // await timeDB.clear(); 
            Logger.log("TimeManager migration completed.");
        } catch (e) {
            Logger.error("Migration failed:", e);
        }
    }

    static async getKeys(): Promise<string[]> {
        return Object.keys(this.cachedDB);
    }

    static async getTime(key: string): Promise<Date> {
        const timestamp = this.cachedDB[key];
        return timestamp ? new Date(timestamp) : new Date(0);
    }

    static async setTime(key: string, timestamp: Date): Promise<void> {
        const existingTime = this.cachedDB[key];
        // Only set if not exists (preserving creation time logic from original code)
        if (!existingTime) {
            this.cachedDB[key] = timestamp.toISOString();
            this.debouncedSave();
        }
    }

    static async bulkDelete(keys: string[]): Promise<void> {
        let changed = false;
        for (const key of keys) {
            if (this.cachedDB[key]) {
                delete this.cachedDB[key];
                changed = true;
            }
        }

        if (changed) {
            this.debouncedSave();
        }
    }
}
