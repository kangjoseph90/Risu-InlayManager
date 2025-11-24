import { RisuAPI } from '../api';
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

            const charId = char.charId; // Using charId as per requirement "chaId is the character's v4 id" (Assuming property name is charId or similar, verified via user description "chaId")
            // Wait, user said "chaId는 캐릭터의 v4 id". I need to be careful with the property name.
            // RisuAPI.getChar() returns "any".
            // User description: "{chaId:string, chatPage:number, chats: {id:string}[]}을 반환한다."

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
            console.warn('Error tracking chat info:', error);
        }
    }
}
