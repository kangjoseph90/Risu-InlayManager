/**
 * Triggers a browser download for the given content.
 * @param content The string content to download.
 * @param fileName The name of the file.
 * @param mimeType The MIME type of the file.
 */
export function downloadFile(content: string, fileName: string, mimeType: string) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

/**
 * Reads the content of a File object as a text string.
 * @param file The File object to read.
 * @returns A Promise that resolves with the file's text content.
 */
export function readFileAsText(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            resolve(reader.result as string);
        };
        reader.onerror = () => {
            reject(reader.error);
        };
        reader.readAsText(file);
    });
}

export function debounce<T extends (...args: any[]) => void>(
    func: T,
    wait: number
): (...args: Parameters<T>) => void {
    let timeout: number | undefined;

    return function(this: ThisParameterType<T>, ...args: Parameters<T>): void {
        const context = this;
        clearTimeout(timeout);
        timeout = window.setTimeout(() => {
            func.apply(context, args);
        }, wait);
    };
}

/**
 * Converts a base64 data URI to a Blob object.
 * @param b64 The base64 data URI string (e.g., "data:image/png;base64,...")
 * @returns A Blob object
 */
export function base64ToBlob(b64: string): Blob {
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

/**
 * Converts a Blob to a base64 data URI string.
 * @param blob The Blob to convert
 * @returns A Promise that resolves to a base64 data URI string
 */
export function blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}

/**
 * Converts InlayData to a serializable object with string data (for Google Drive).
 * If data is a Blob, converts it to base64 data URI.
 * @param data The InlayData object
 * @returns A Promise that resolves to a serializable object
 */
export async function inlayDataToSerializable(data: any): Promise<any> {
    if (data.data instanceof Blob) {
        const base64 = await blobToBase64(data.data);
        return { ...data, data: base64 };
    }
    return data;
}
