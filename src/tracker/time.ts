import { type EditFunction, ScriptMode, RisuAPI } from '../api';
import { TimeManager } from '../manager/meta';

export class TimeTracker {
    private inlayObserver: EditFunction = async (content: string) => {
        try {
            const regex = /\{\{(inlay|inlayed|inlayeddata)::(.*?)\}\}/g;
            let match;
            while ((match = regex.exec(content)) !== null) {
                const parsed = match[2];
                await TimeManager.setTime(parsed, new Date());
            }
        } catch (error) {
            console.warn('Error setting timestamp:', error);
        }
        return content;
    };

    constructor() {
        RisuAPI.addRisuScriptHandler(ScriptMode.EditDisplay, this.inlayObserver);
    }

    destroy() {
        RisuAPI.removeRisuScriptHandler(ScriptMode.EditDisplay, this.inlayObserver);
    }
}