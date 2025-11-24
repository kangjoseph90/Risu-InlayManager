import localForage from 'localforage';
import { RisuAPI } from '../api';
import { CHAT_DB_ARG } from '../plugin';
import { debounce } from '../util';
import { Logger } from '../logger';

export interface ChatData {
    charId: string;
    chatId: string;
}

const chatDB = localForage.createInstance({
    name: 'inlay',
    storeName: 'chat',
});

export class ChatManager {
    private static cachedDB: Record<string, ChatData> = {};
    private static readonly DEBOUNCE_WAIT = 1000;
    private static initialized = false;

    private static debouncedSave = debounce(() => {
        RisuAPI.setArg(CHAT_DB_ARG, JSON.stringify(ChatManager.cachedDB));
    }, ChatManager.DEBOUNCE_WAIT);

    static async init() {
        if (this.initialized) return;

        try {
            const storedDB = RisuAPI.getArg(CHAT_DB_ARG) as string;
            if (storedDB) {
                this.cachedDB = JSON.parse(storedDB);
            }

            if (Object.keys(this.cachedDB).length === 0) {
                await this.migrateFromLocalForage();
            }

            this.initialized = true;
        } catch (e) {
            Logger.error("Failed to init ChatManager:", e);
            await this.migrateFromLocalForage();
            this.initialized = true;
        }
    }

    private static async migrateFromLocalForage() {
        try {
            const keys = await chatDB.keys();
            if (keys.length === 0) return;

            Logger.log(`Migrating ${keys.length} chat records from localForage...`);
            
            await chatDB.iterate<ChatData, void>((value, key) => {
                if (value) {
                    this.cachedDB[key] = value;
                }
            });

            RisuAPI.setArg(CHAT_DB_ARG, JSON.stringify(this.cachedDB));
            Logger.log("ChatManager migration completed.");
        } catch (e) {
            Logger.error("Chat migration failed:", e);
        }
    }

    static async getKeys(): Promise<string[]> {
        if (!this.initialized) await this.init();
        return Object.keys(this.cachedDB);
    }

    static async getChatData(key: string): Promise<ChatData | null> {
        if (!this.initialized) await this.init();
        return this.cachedDB[key] || null;
    }

    static async setChatData(key: string, data: ChatData): Promise<void> {
        if (!this.initialized) await this.init();
        
        const existingData = this.cachedDB[key];
        // If identical data exists, skip
        if (existingData && existingData.charId === data.charId && existingData.chatId === data.chatId) {
            return;
        }
        
        // Note: Logic changed slightly from original. Original only skipped if identical. 
        // It allowed overwrite if different. This implementation maintains that behavior.
        this.cachedDB[key] = data;
        this.debouncedSave();
    }

    static async deleteChatData(key: string): Promise<void> {
        if (!this.initialized) await this.init();
        
        if (this.cachedDB[key]) {
            delete this.cachedDB[key];
            this.debouncedSave();
        }
    }

    static async bulkDelete(keys: string[]): Promise<void> {
        if (!this.initialized) await this.init();
        
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

    static async getCharacters(): Promise<Set<string>> {
        if (!this.initialized) await this.init();
        
        const chars = new Set<string>();
        Object.values(this.cachedDB).forEach(value => {
            if (value && value.charId) {
                chars.add(value.charId);
            }
        });
        return chars;
    }

    static async getChats(charId: string): Promise<Set<string>> {
        if (!this.initialized) await this.init();
        
        const chats = new Set<string>();
        Object.values(this.cachedDB).forEach(value => {
            if (value && value.charId === charId && value.chatId) {
                chats.add(value.chatId);
            }
        });
        return chats;
    }
}