import { ChatManager } from "./chat";
import { TimeManager } from "./time";

export function initManagers() {
    TimeManager.init();
    ChatManager.init();
}

// Export sync-related classes for external use
export { AuthManager } from "./auth";
export { DriveManager } from "./drive";
export { SyncManager, type SyncReport, type SyncOptions } from "./sync";
export { InlayManager } from "./inlay";
export { BackupManager } from "./backup";
export { AutoSyncManager } from "./autoSync";