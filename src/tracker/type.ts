import { InlayManager } from "../manager/inlay";
import { TypeManager } from "../manager/meta";
import { InlayEventSystem, InlayEventType } from "../events/InlayEventSystem";

export class TypeTracker {
    private static eventSystem = InlayEventSystem.getInstance();
    
    static async sync() {
        const inlayKeys = new Set(await InlayManager.getKeys());
        const typeKeys = new Set(await TypeManager.getKeys());

        const newKeys = [...inlayKeys].filter(key => !typeKeys.has(key));
        const deletedKeys = [...typeKeys].filter(key => !inlayKeys.has(key));

        for (const key of newKeys) {
            const inlayData = await InlayManager.getInlayData(key);
            if (inlayData && inlayData.type) {
                await TypeManager.setType(key, inlayData.type);
            }
        }

        if (deletedKeys.length > 0) {
            await TypeManager.bulkDelete(deletedKeys);
        }
        
        // sync 완료 이벤트 발생
        this.eventSystem.emit(InlayEventType.SYNC_COMPLETED, {
            newKeys,
            deletedKeys,
            totalKeys: inlayKeys.size
        });
    }
}