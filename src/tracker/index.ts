import { ScriptMode, RisuAPI, type EditFunction } from '../api';

type TrackerCallback = (key: string) => Promise<void>;

export class TrackerManager {
    private static instance: TrackerManager;
    private subscribers: TrackerCallback[] = [];

    private inlayObserver: EditFunction = async (content: string) => {
        try {
            const regex = /\{\{(inlay|inlayed|inlayeddata)::(.*?)\}\}/g;
            let match;
            while ((match = regex.exec(content)) !== null) {
                const parsed = match[2];
                // Notify all subscribers
                await Promise.all(this.subscribers.map(cb => cb(parsed)));
            }
        } catch (error) {
            console.warn('Error processing inlay tag:', error);
        }
        return content;
    };

    private constructor() {
        RisuAPI.addRisuScriptHandler(ScriptMode.EditDisplay, this.inlayObserver);
    }

    static getInstance(): TrackerManager {
        if (!TrackerManager.instance) {
            TrackerManager.instance = new TrackerManager();
        }
        return TrackerManager.instance;
    }

    subscribe(callback: TrackerCallback) {
        this.subscribers.push(callback);
    }

    destroy() {
        RisuAPI.removeRisuScriptHandler(ScriptMode.EditDisplay, this.inlayObserver);
        this.subscribers = [];
    }
}
