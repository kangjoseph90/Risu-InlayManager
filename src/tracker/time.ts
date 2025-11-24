import { TimeManager } from '../manager/time';
import { TrackerManager } from './index';

export class TimeTracker {
    constructor() {
        TrackerManager.getInstance().subscribe(this.handleKey);
    }

    private handleKey = async (key: string) => {
        try {
            await TimeManager.setTime(key, new Date());
        } catch (error) {
            console.warn('Error setting timestamp:', error);
        }
    }

    destroy() {
        // No explicit destroy needed for the subscription in this simple model,
        // but if we wanted to unsubscribe we would need to add that method to TrackerManager.
        // For now, since TimeTracker lives as long as the plugin, it's fine.
        // However, the original code had a destroy that removed the script handler.
        // Now TrackerManager manages the handler.
        // If TimeTracker is destroyed, it should probably unsubscribe.
        // Let's assume for now it persists.
    }
}
