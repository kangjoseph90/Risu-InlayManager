import { ChatManager } from "./chat";
import { TimeManager } from "./time";

export function initManagers() {
    TimeManager.init();
    ChatManager.init();
}