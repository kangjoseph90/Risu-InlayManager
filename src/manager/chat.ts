import localForage from 'localforage';

export interface ChatData {
    charId: string;
    chatId: string;
}

const chatDB = localForage.createInstance({
    name: 'inlay',
    storeName: 'chat',
});

export class ChatManager {
    static async getKeys(): Promise<string[]> {
        return await chatDB.keys();
    }

    static async getChatData(key: string): Promise<ChatData | null> {
        return await chatDB.getItem<ChatData>(key);
    }

    static async setChatData(key: string, data: ChatData): Promise<void> {
        const existingData = await chatDB.getItem<ChatData>(key);
        // Only set if not exists, or update if different (though typically we want to capture the first occurrence or just ensure it's there)
        // Based on "track when ondisplay", we should probably just save it.
        // But if we want to avoid overwriting with same data redundantly, we can check.
        // If the asset is seen in a different chat, should we update it?
        // The requirement says "tracking", implying we record where it was found.
        // Since the key is the asset ID, and one asset ID is likely unique to a generation,
        // it probably doesn't change context often.
        // If an asset is viewed again in the same context, no change.
        // If it's viewed in a different context, we might want to update or keep the original.
        // Let's assume we update it to the latest context seen.

        // However, checking for existence first prevents unnecessary writes.
        if (existingData && existingData.charId === data.charId && existingData.chatId === data.chatId) {
            return;
        }
        await chatDB.setItem(key, data);
    }

    static async deleteChatData(key: string): Promise<void> {
        await chatDB.removeItem(key);
    }

    static async bulkDelete(keys: string[]): Promise<void> {
        await Promise.all(keys.map(key => chatDB.removeItem(key)));
    }

    /**
     * Get all unique character IDs that have associated assets.
     */
    static async getCharacters(): Promise<Set<string>> {
        const chars = new Set<string>();
        await chatDB.iterate<ChatData, void>((value) => {
            if (value && value.charId) {
                chars.add(value.charId);
            }
        });
        return chars;
    }

    /**
     * Get all unique chat IDs for a specific character that have associated assets.
     */
    static async getChats(charId: string): Promise<Set<string>> {
        const chats = new Set<string>();
        await chatDB.iterate<ChatData, void>((value) => {
            if (value && value.charId === charId && value.chatId) {
                chats.add(value.chatId);
            }
        });
        return chats;
    }
}
