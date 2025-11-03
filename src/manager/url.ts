import type { InlayData } from "../types";

const urlCache = new Map<string, string>();

function base64ToBlob(b64: string): Blob {
    const splitDataURI = b64.split(',');
    const byteString = atob(splitDataURI[1]);
    const mimeString = splitDataURI[0].split(':')[1].split(';')[0];

    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
    }

    return new Blob([ab], { type: mimeString });
}

export class UrlManager {
    static async getDataURL(key: string, data: InlayData): Promise<string> {
        if (urlCache.has(key)) {
            return urlCache.get(key)!;
        }
        if (typeof data.data === 'string') {
            const blob = base64ToBlob(data.data);
            const url = URL.createObjectURL(blob);
            urlCache.set(key, url);
            return url;
        } else if (data.data instanceof Blob) {
            const url = URL.createObjectURL(data.data);
            urlCache.set(key, url);
            return url;
        }
        return '';
    }
}
