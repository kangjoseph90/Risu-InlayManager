import { InlayManager } from "../manager/inlay";
import { TypeManager } from "../manager/meta";

// Global queue variables
let syncQueue: Set<string> = new Set();
let deleteQueue: Set<string> = new Set();
let isProcessing = false;
let processingInterval: NodeJS.Timeout | null = null;

export class TypeTracker {
    private processingIntervalMs = 1000; // Check queue every second
    
    constructor() {
        this.startBackgroundProcessor();
    }
    
    private async syncKey(key: string): Promise<boolean> {
        try {
            const existingType = await TypeManager.getType(key);
            if (existingType) {
                return false; 
            }
            
            const inlayData = await InlayManager.getInlayData(key);
            if (inlayData && inlayData.type) {
                await TypeManager.setType(key, inlayData.type);
                return true;
            }
            
            return false;
        } catch (error) {
            console.warn(`Error syncing key ${key}:`, error);
            return false;
        }
    }
    
    private async processQueues(): Promise<void> {
        if (isProcessing || (syncQueue.size === 0 && deleteQueue.size === 0)) {
            return;
        }
        
        isProcessing = true;
        
        try {
            let keysToDelete: string[] = [];
            
            if (deleteQueue.size > 0) {
                keysToDelete = Array.from(deleteQueue);
                deleteQueue.clear();
                
                await TypeManager.bulkDelete(keysToDelete);
            }
            
            if (syncQueue.size > 0) {
                const keysToSync = Array.from(syncQueue);
                syncQueue.clear();
                
                const syncedKeys: string[] = [];
                
                for (const key of keysToSync) {
                    const success = await this.syncKey(key);
                    if (success) {
                        syncedKeys.push(key);
                    }
                }
            }
        } catch (error) {
            console.error('Error processing queues:', error);
        } finally {
            isProcessing = false;
        }
    }
    
    private startBackgroundProcessor(): void {
        if (processingInterval) {
            clearInterval(processingInterval);
        }
        
        processingInterval = setInterval(() => {
            this.processQueues();
        }, this.processingIntervalMs);
    }
    
    private stopBackgroundProcessor(): void {
        if (processingInterval) {
            clearInterval(processingInterval);
            processingInterval = null;
        }
    }
    
    static async sync(): Promise<void> {
        const inlayKeys = await InlayManager.getKeys();
        const typeKeys = await TypeManager.getKeys();

        const newKeys = inlayKeys.filter(key => !typeKeys.includes(key));
        const deletedKeys = typeKeys.filter(key => !inlayKeys.includes(key));
        
        newKeys.forEach(key => {
            syncQueue.add(key);
        });
        
        deletedKeys.forEach(key => {
            deleteQueue.add(key);
        });
    }

    destroy(): void {
        this.stopBackgroundProcessor();
        syncQueue.clear();
        deleteQueue.clear();
    }
}