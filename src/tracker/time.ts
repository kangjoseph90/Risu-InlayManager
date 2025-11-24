import { Logger } from '../logger';
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
            Logger.warn('Error setting timestamp:', error);
        }
    }

    destroy() {
        TrackerManager.getInstance().unsubscribe(this.handleKey);
    }
}
