export class InlayEventSystem {
    private static instance: InlayEventSystem;
    private listeners = new Map<string, Set<Function>>();
    
    static getInstance(): InlayEventSystem {
        if (!this.instance) {
            this.instance = new InlayEventSystem();
        }
        return this.instance;
    }
    
    on(event: string, callback: Function): () => void {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }
        this.listeners.get(event)!.add(callback);
        
        // 구독 해제 함수 반환
        return () => this.listeners.get(event)?.delete(callback);
    }
    
    off(event: string, callback: Function): void {
        const callbacks = this.listeners.get(event);
        if (callbacks) {
            callbacks.delete(callback);
        }
    }
    
    emit(event: string, data?: any): void {
        const callbacks = this.listeners.get(event);
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
}

// 이벤트 타입 정의
export enum InlayEventType {
    DATA_ADDED = 'inlay:data:added',
    DATA_REMOVED = 'inlay:data:removed',
    DATA_UPDATED = 'inlay:data:updated',
    TYPE_CHANGED = 'inlay:type:changed',
    TIME_UPDATED = 'inlay:time:updated',
    SYNC_COMPLETED = 'inlay:sync:completed'
}