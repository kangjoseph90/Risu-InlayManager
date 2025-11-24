import { RisuAPI } from '../api';
import { Logger } from '../logger';
import { ChatManager } from '../manager/chat';
import { TrackerManager } from './index';

export class ChatTracker {
    constructor() {
        TrackerManager.getInstance().subscribe(this.handleKey);
    }

    private handleKey = async (key: string) => {
        try {
            const char = RisuAPI.getChar();
            if (!char) return;
            
            const chaId = char.chaId;
            const chatPage = char.chatPage;
            const chats = char.chats;

            if (chaId && chats && Array.isArray(chats) && typeof chatPage === 'number') {
                const currentChat = chats[chatPage];
                if (currentChat && currentChat.id) {
                     await ChatManager.setChatData(key, {
                        charId: chaId,
                        chatId: currentChat.id
                    });
                }
            }
        } catch (error) {
            Logger.warn('Error tracking chat info:', error);
        }
    }

    destroy() {
        TrackerManager.getInstance().unsubscribe(this.handleKey);
    }
}
