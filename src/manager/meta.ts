import Dexie, { type EntityTable } from "dexie";
import { PLUGIN_TITLE } from "../plugin";
import type { InlayType } from "../types";
import { InlayEventSystem, InlayEventType } from "../events/InlayEventSystem";

interface TypeEntry {
    key: string;
    type: InlayType;
}

interface TimeEntry {
    key: string;
    timestamp: Date;
}

const db = new Dexie(PLUGIN_TITLE) as Dexie & {
    type: EntityTable<TypeEntry, 'key'>,
    time: EntityTable<TimeEntry, 'key'>
}; 

db.version(1).stores({
    type: '&key, type',
    time: '&key, timestamp'
})

export class TypeManager {
    private static eventSystem = InlayEventSystem.getInstance();
    
    static async getKeys(type?: InlayType): Promise<string[]> {
        const keys = type
            ? await db.type.where('type').equals(type).primaryKeys()
            : await db.type.toArray().then(metas => metas.map(meta => String(meta.key)));
        return keys.map(key => String(key));
    }

    static async getType(key: string): Promise<InlayType | undefined> {
        const entry = await db.type.get(key);
        return entry?.type;
    }

    static async setType(key: string, type: InlayType): Promise<void> {
        const entry = await db.type.get(key);
        if (!entry) {
            await db.type.put({ key, type });
            this.eventSystem.emit(InlayEventType.TYPE_CHANGED, { key, type });
        }
    }

    static async bulkDelete(keys: string[]): Promise<void> {
        await db.type.bulkDelete(keys);
        // 삭제된 키들에 대해 이벤트 발생
        keys.forEach(key => {
            this.eventSystem.emit(InlayEventType.DATA_REMOVED, { key });
        });
    }
}

export class TimeManager {
    private static eventSystem = InlayEventSystem.getInstance();
    
    static async getKeys(): Promise<string[]> {
        return await db.time.toArray().then(entries => entries.map(entry => String(entry.key)));
    }

    static async getTime(key: string): Promise<Date | undefined> {
        const entry = await db.time.get(key);
        return entry?.timestamp;
    }

    static async setTime(key: string, timestamp: Date): Promise<void> {
        const entry = await db.time.get(key);
        if (!entry) {
            await db.time.put({ key, timestamp });
            this.eventSystem.emit(InlayEventType.TIME_UPDATED, { key, timestamp });
        }
    }

    static async bulkDelete(keys: string[]): Promise<void> {
        await db.time.bulkDelete(keys);
        
    }
}