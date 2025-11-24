//@ts-ignore
import './style.css';
import { RisuAPI } from './api';
import { UI } from './ui';
import { TimeTracker } from './tracker/time';
import { ChatTracker } from './tracker/chat';
import { TrackerManager } from './tracker/index';
import { initManagers, AutoSyncManager } from './manager';
import { UpdateManager } from './manager/update';
import { AuthManager } from './manager/auth';

initManagers();

// Initialize trackers
const trackerManager = TrackerManager.getInstance();
const timeTracker = new TimeTracker();
const chatTracker = new ChatTracker();

// Initialize auto sync
const autoSyncManager = AutoSyncManager.getInstance();
autoSyncManager.init();

const ui = new UI();

RisuAPI.onUnload(() => {
    trackerManager.destroy();
    timeTracker.destroy();
    chatTracker.destroy();
    autoSyncManager.destroy();
    ui.destroy();
});

//@ts-ignore
globalThis.login = AuthManager.login;

(async () => {
    if (await UpdateManager.check()) return;
})()
