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
}