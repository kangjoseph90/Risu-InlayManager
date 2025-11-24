import { RisuAPI } from "../api";
import { PLUGIN_NAME, PLUGIN_TITLE, PLUGIN_VERSION } from "../plugin";
import { Logger } from "../logger";
import { confirm, alert, warn } from "../ui/popup";
import { get } from "svelte/store";

const PACKAGE_NAME = "risu-inlay-manager";
const NPM_REGISTRY_URL = `https://registry.npmjs.org/${PACKAGE_NAME}/latest`;
const UNPKG_URL = `https://unpkg.com/${PACKAGE_NAME}@latest/dist/risu-inlay-manager.js`;

interface PluginData {
    name: string;
    script: string;
    realArg: Record<string, string | number>;
    arguments: Record<string, "string" | "int">;
    displayName?: string;
    version: number;
    customLink: { link: string; hoverText?: string }[];
}

export class UpdateManager {
    static async check(): Promise<boolean> {
        try {
            Logger.log("Checking for updates...");
            const response = await fetch(NPM_REGISTRY_URL);
    
            if (!response || !response.ok) {
                Logger.error("Failed to fetch latest version info from npm.");
                return false;
            }
    
            const data = await response.json();
            const latestVersion = data.version;

            if (this.compareVersions(latestVersion, PLUGIN_VERSION) > 0) {
                Logger.log(`New version available: ${latestVersion}. Updating...`);
                                
                const confirmed = await confirm(`새 버전이 있습니다: ${PLUGIN_TITLE} v${latestVersion}.\n업데이트하시겠습니까?`);
                
                if (!confirmed) {
                    Logger.log("Update cancelled by user.");
                    return false;
                } 

                const result = await this.updatePlugin();

                if (result) {
                    await alert("업데이트가 완료되었습니다");
                } else {
                    await warn("업데이트에 실패했습니다");
                }

                return result;
            } else {
                Logger.log("Plugin is up to date.");
                return false;
            }
        } catch (error) {
            Logger.error("Error checking for updates:", error);
            return false;
        }
    }

    private static async updatePlugin(): Promise<boolean> {
        try {
            const response = await fetch(UNPKG_URL);
    
            if (!response || !response.ok) {
                Logger.error("Failed to download latest plugin script.");
                return false;
            }
    
            const scriptContent = await response.text();
            const parsed = this.parsePluginScript(scriptContent);
            
            const result = this.scriptUpdater(parsed);
            if (result.success) {
                Logger.log("Plugin updated successfully! Reloading...");
                return true;
            } else {
                Logger.error("Failed to update plugin database.");
                return false;
            }
    
        } catch (error) {
            Logger.error("Error updating plugin:", error);
            return false;
        }
    }

    private static compareVersions(v1: string, v2: string): number {
        const parts1 = v1.split('.').map(Number);
        const parts2 = v2.split('.').map(Number);
    
        for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
            const p1 = parts1[i] || 0;
            const p2 = parts2[i] || 0;
            if (p1 > p2) return 1;
            if (p1 < p2) return -1;
        }
        return 0;
    }

    private static parsePluginScript(scriptContent: string): PluginData {
        const splitedJs = scriptContent.split("\n");
    
        let name = "";
        let displayName: string | undefined = undefined;
        let arg: Record<string, "string" | "int"> = {};
        let realArg: Record<string, string | number> = {};
        let customLink: { link: string; hoverText?: string }[] = [];
    
        for (const line of splitedJs) {
            if (line.startsWith("//@risu-name") || line.startsWith("//@risu-display-name")) {
                throw new Error("V1 plugin is not supported. Please use V2 plugin.");
            }
    
            if (line.startsWith("//@name")) {
                const provided = line.slice(7).trim();
                if (provided === "") {
                    throw new Error("Plugin name must be longer than 0");
                }
                name = provided;
            }
    
            if (line.startsWith("//@display-name")) {
                const provided = line.slice("//@display-name".length + 1).trim();
                if (provided === "") {
                    throw new Error("Plugin display name must be longer than 0");
                }
                displayName = provided;
            }
    
            if (line.startsWith("//@link")) {
                const parts = line.split(" ");
                const link = parts[1];
                if (!link || link === "") {
                    throw new Error("Plugin link is empty");
                }
                if (!link.startsWith("https")) {
                    throw new Error("Plugin link must start with https");
                }
                const hoverText = parts.slice(2).join(" ").trim();
                customLink.push({
                    link: link,
                    hoverText: hoverText || undefined,
                });
            }
    
            if (line.startsWith("//@risu-arg") || line.startsWith("//@arg")) {
                const provided = line.trim().split(" ");
                const provKey = provided[1];
                const type = provided[2];
    
                if (type !== "int" && type !== "string") {
                    throw new Error(`Unknown argument type: ${type}`);
                }
    
                if (type === "int") {
                    arg[provKey] = "int";
                    realArg[provKey] = 0;
                } else if (type === "string") {
                    arg[provKey] = "string";
                    realArg[provKey] = "";
                }
            }
        }
    
        if (name.length === 0) {
            throw new Error("Plugin name not found");
        }
    
        return {
            name: name,
            script: scriptContent,
            realArg: realArg,
            arguments: arg,
            displayName: displayName,
            version: 2,
            customLink: customLink,
        };
    }

    private static scriptUpdater(parsed: PluginData): { success: boolean; error?: any } {
        const db = RisuAPI.getDatabase();
        const oldPluginIndex = db.plugins.findIndex((p: any) => p.name === PLUGIN_NAME); 
        const backup = oldPluginIndex >= 0 ? { ...db.plugins[oldPluginIndex] } : null;
    
        const mergedRealArg = this.mergeRealArgs(backup?.realArg, parsed.arguments);
    
        const newPlugin = {
            ...parsed,
            realArg: mergedRealArg,
        };
    
        if (oldPluginIndex >= 0) {
            db.plugins[oldPluginIndex] = newPlugin;
        }
    
        try {
            RisuAPI.setDatabaseLite(db);
            RisuAPI.loadPlugins(); // Reload plugins to apply changes
            return { success: true };
        } catch (saveError) {
            Logger.error("Database save failed:", saveError);
            if (backup && oldPluginIndex >= 0) {
                db.plugins[oldPluginIndex] = backup;
            }
            return { success: false, error: saveError };
        }
    }

    private static mergeRealArgs(oldRealArg: any, newArguments: Record<string, "string" | "int">) {
        const merged: any = {};
    
        for (const [key, type] of Object.entries(newArguments)) {
            if (oldRealArg && key in oldRealArg) {
                merged[key] = oldRealArg[key];
            } else {
                merged[key] = type === "int" ? 0 : "";
            }
        }
    
        return merged;
    }
}
