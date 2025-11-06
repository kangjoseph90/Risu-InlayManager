// Global listeners variable
let listeners = new Map<string, Set<Function>>();

export class InlayEventSystem {
    static on(event: string, callback: Function): () => void {
        if (!listeners.has(event)) {
            listeners.set(event, new Set());
        }
        listeners.get(event)!.add(callback);
        return () => listeners.get(event)?.delete(callback);
    }
    
    static off(event: string, callback: Function): void {
        const callbacks = listeners.get(event);
        if (callbacks) {
            callbacks.delete(callback);
        }
    }
    
    static emit(event: string, data?: any): void {
        const callbacks = listeners.get(event);
        if (callbacks) {
            callbacks.forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`Error in event listener for ${event}:`, error);
                }
            });
        }
    }

    static clear(): void {
        listeners.clear();
    }
    
    static getEventNames(): string[] {
        return Array.from(listeners.keys());
    }
  
    static getListenerCount(event: string): number {
        return listeners.get(event)?.size || 0;
    }
}

// 이벤트 타입 정의
export enum InlayEventType {
    DATA_ADDED = 'inlay:data:added',
    DATA_REMOVED = 'inlay:data:removed',
    TIME_ADDED = 'inlay:time:added',
    TIME_REMOVED = 'inlay:time:removed',
}