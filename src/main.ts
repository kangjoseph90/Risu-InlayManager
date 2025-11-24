//@ts-ignore
import './style.css';
import { RisuAPI } from './api';
import { UI } from './ui';
import { TimeTracker } from './tracker/time';
import { ChatTracker } from './tracker/chat';
import { TrackerManager } from './tracker/index';

// Initialize trackers
const trackerManager = TrackerManager.getInstance();
const timeTracker = new TimeTracker();
const chatTracker = new ChatTracker();

const ui = new UI();

RisuAPI.onUnload(() => {
    trackerManager.destroy();
    ui.destroy();
})
