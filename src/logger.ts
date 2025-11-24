/**
 * log,
 * error,
 * warn,
 * info,
 * debug
 */
export class Logger {
    static log(...message: any[]) {
        console.log("[Inlay]", ...message);
    }
    static error(...message: any[]) {
        console.error("[Inlay]", ...message);
    }   
    static warn(...message: any[]) {
        console.warn("[Inlay]", ...message);
    }
    static info(...message: any[]) {
        console.info("[Inlay]", ...message);
    }
    static debug(...message: any[]) {
        console.debug("[Inlay]", ...message);
    }
}