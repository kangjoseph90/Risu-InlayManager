import localForage from 'localforage';
import type { InlayData } from '../types';

const db = localForage.createInstance({
    name: 'inlay',
    storeName: 'inlay',
});

export class InlayManager {
    static async getKeys(): Promise<string[]> {
        return await db.keys();
    }

    static async getInlayData(key: string): Promise<InlayData | null> {
        return await db.getItem(key) as InlayData | null;
    }

    static async setInlayData(key: string, data: InlayData): Promise<void> {
        await db.setItem(key, data);
        // Remove from deleted tombstone if it was previously deleted
        // Import SyncManager dynamically to avoid circular dependency
        const { SyncManager } = await import('./sync');
        SyncManager.removeDeletedInlay(key);
    }

    static async deleteInlay(key: string): Promise<void> {
        await db.removeItem(key);
        // Add to deleted tombstone for cross-device deletion
        // Import SyncManager dynamically to avoid circular dependency
        const { SyncManager } = await import('./sync');
        SyncManager.addDeletedInlay(key);
    }

    static async getAllInlays(): Promise<Map<string, InlayData>> {
        const keys = await this.getKeys();
        const map = new Map<string, InlayData>();
        
        for (const key of keys) {
            const data = await this.getInlayData(key);
            if (data) {
                map.set(key, data);
            }
        }
        
        return map;
    }

    static async hasInlay(key: string): Promise<boolean> {
        const data = await this.getInlayData(key);
        return data !== null;
    }
}