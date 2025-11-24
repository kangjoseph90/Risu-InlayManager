import { InlayType } from "../types";
import { InlayManager } from "./inlay";
import { Queue } from '@datastructures-js/queue';
import { base64ToBlob } from "../util";

// Cache management
const dataCache = new Map<string, { url: string, type: InlayType }>();
const dataEntry = new Queue<string>();
const MAX_CACHE_SIZE = 100;

// Request concurrency control
const MAX_CONCURRENT_REQUESTS = 5;
let activeRequests = 0;
const requestQueue: Array<{
    key: string;
    resolve: (value: { url: string, type: InlayType } | null) => void;
    reject: (reason?: any) => void;
}> = [];

export class DataManager {
    static async getDataType(key: string): Promise<InlayType | null> {
        const data = await this.getData(key);
        return data?.type ?? null;
    }

    static async getDataURL(key: string): Promise<string | null> {
        const data = await this.getData(key);
        return data?.url ?? null;
    }

    static async getData(key: string): Promise<{ url: string, type: InlayType } | null> {
        // Check cache first
        if (dataCache.has(key)) {
            return dataCache.get(key)!;
        }

        // Use request queue for concurrency control
        return new Promise((resolve, reject) => {
            requestQueue.push({ key, resolve, reject });
            this.processQueue();
        });
    }

    private static async processQueue(): Promise<void> {
        // Process requests up to the concurrency limit
        while (activeRequests < MAX_CONCURRENT_REQUESTS && requestQueue.length > 0) {
            const request = requestQueue.shift();
            if (!request) break;

            activeRequests++;
            
            // Execute the actual data loading
            this.loadDataInternal(request.key)
                .then(request.resolve)
                .catch(request.reject)
                .finally(() => {
                    activeRequests--;
                    this.processQueue(); // Process next item in queue
                });
        }
    }

    private static async loadDataInternal(key: string): Promise<{ url: string, type: InlayType } | null> {
        // Double-check cache (might have been loaded while waiting in queue)
        if (dataCache.has(key)) {
            return dataCache.get(key)!;
        }

        const data = await InlayManager.getInlayData(key);
        if (!data) {
            return null;
        }

        const type = data.type ?? InlayType.Image;

        if (typeof data.data === 'string') {
            const blob = base64ToBlob(data.data);
            const url = URL.createObjectURL(blob);
            dataCache.set(key, { url, type });
            this.pushDataEntry(key);
            return { url, type };
        } else if (data.data instanceof Blob) {
            const url = URL.createObjectURL(data.data);
            dataCache.set(key, { url, type });
            this.pushDataEntry(key);
            return { url, type };
        }
        return null;
    }

    static revokeAll(): void {
        for (const { url } of dataCache.values()) {
            URL.revokeObjectURL(url);
        }
        dataCache.clear();
        dataEntry.clear();
    }

    private static pushDataEntry(key: string): void {
        dataEntry.enqueue(key);

        if (dataEntry.size() > MAX_CACHE_SIZE) {
            const oldestKey = dataEntry.dequeue();
            if (oldestKey && dataCache.has(oldestKey)) {
                const data = dataCache.get(oldestKey)!;
                URL.revokeObjectURL(data.url);
                dataCache.delete(oldestKey);
            }
        }
    }

}
