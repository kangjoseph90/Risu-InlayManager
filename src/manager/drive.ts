import { AuthManager } from "./auth";
import { Logger } from "../logger";
import type { InlayData } from "../types";
import { inlayDataToSerializable } from "../util";

const INLAY_FOLDER_NAME = 'inlays';

export class DriveManager {
    private static inlayFolderId: string | null = null;
    private static fileIdCache: Map<string, string> | null = null;

    /**
     * Ensures the inlays folder exists in appDataFolder and returns its ID
     */
    static async ensureInlayFolder(): Promise<string> {
        if (this.inlayFolderId) {
            return this.inlayFolderId;
        }

        const token = await AuthManager.getAccessToken();

        // Check if folder already exists
        const searchUrl = `https://www.googleapis.com/drive/v3/files?` +
            `q=name='${INLAY_FOLDER_NAME}' and 'appDataFolder' in parents and trashed=false` +
            `&spaces=appDataFolder` +
            `&fields=files(id,name)`;

        const searchRes = await fetch(searchUrl, {
            headers: { Authorization: `Bearer ${token}` }
        });

        if (!searchRes.ok) {
            throw new Error(`Failed to search for inlay folder: ${await searchRes.text()}`);
        }

        const searchData = await searchRes.json();

        if (searchData.files && searchData.files.length > 0) {
            this.inlayFolderId = searchData.files[0].id;
            Logger.log('Found existing inlay folder:', this.inlayFolderId);
            return this.inlayFolderId!;
        }

        // Create folder if it doesn't exist
        const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                name: INLAY_FOLDER_NAME,
                mimeType: 'application/vnd.google-apps.folder',
                parents: ['appDataFolder']
            })
        });

        if (!createRes.ok) {
            throw new Error(`Failed to create inlay folder: ${await createRes.text()}`);
        }

        const folderData = await createRes.json();
        this.inlayFolderId = folderData.id;
        Logger.log('Created inlay folder:', this.inlayFolderId);
        return this.inlayFolderId!;
    }

    /**
     * Lists all inlay IDs (file names without .json) in the drive folder
     */
    static async listInlayIds(): Promise<string[]> {
        const mapping = await this.listInlayIdsWithFileIds();
        return Array.from(mapping.keys());
    }

    /**
     * Lists all inlay IDs with their corresponding Drive file IDs
     * Returns a Map of inlay ID -> Drive file ID for efficient lookup
     */
    static async listInlayIdsWithFileIds(): Promise<Map<string, string>> {
        const folderId = await this.ensureInlayFolder();
        const token = await AuthManager.getAccessToken();

        const mapping = new Map<string, string>();
        let pageToken: string | null = null;

        do {
            const url: string = `https://www.googleapis.com/drive/v3/files?` +
                `q='${folderId}' in parents and trashed=false` +
                `&spaces=appDataFolder` +
                `&fields=nextPageToken,files(id,name)` +
                `&pageSize=1000` +
                (pageToken ? `&pageToken=${pageToken}` : '');

            const res: Response = await fetch(url, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (!res.ok) {
                throw new Error(`Failed to list inlays: ${await res.text()}`);
            }

            const data: any = await res.json();
            
            if (data.files) {
                for (const file of data.files) {
                    // Remove .json extension to get the UUID
                    const id = file.name.replace(/\.json$/, '');
                    mapping.set(id, file.id);
                }
            }

            pageToken = data.nextPageToken || null;
        } while (pageToken);

        Logger.log(`Found ${mapping.size} inlays in drive`);
        return mapping;
    }

    /**
     * Preload file ID cache for batch operations
     */
    static async preloadFileIdCache(): Promise<void> {
        this.fileIdCache = await this.listInlayIdsWithFileIds();
    }

    /**
     * Clear the file ID cache
     */
    static clearFileIdCache(): void {
        this.fileIdCache = null;
    }

    /**
     * Get file ID from cache or fetch it
     */
    private static async getCachedFileId(id: string, folderId: string): Promise<string | null> {
        if (this.fileIdCache) {
            return this.fileIdCache.get(id) || null;
        }
        return await this.getFileId(`${id}.json`, folderId);
    }

    /**
     * Uploads an inlay to Google Drive
     */
    static async uploadInlay(id: string, data: InlayData): Promise<void> {
        const folderId = await this.ensureInlayFolder();
        const token = await AuthManager.getAccessToken();

        // Convert to serializable format (Blob -> base64 if needed)
        const serializable = await inlayDataToSerializable(data);
        const jsonContent = JSON.stringify(serializable);

        const fileName = `${id}.json`;

        // Check if file already exists using cache
        const existingFileId = await this.getCachedFileId(id, folderId);

        if (existingFileId) {
            // Update existing file
            const updateRes = await fetch(
                `https://www.googleapis.com/upload/drive/v3/files/${existingFileId}?uploadType=media`,
                {
                    method: 'PATCH',
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    },
                    body: jsonContent
                }
            );

            if (!updateRes.ok) {
                throw new Error(`Failed to update inlay ${id}: ${await updateRes.text()}`);
            }

            Logger.log(`Updated inlay ${id} in drive`);
        } else {
            // Create new file using multipart upload
            const boundary = '-------314159265358979323846';
            const delimiter = `\r\n--${boundary}\r\n`;
            const close_delim = `\r\n--${boundary}--`;

            const metadata = {
                name: fileName,
                mimeType: 'application/json',
                parents: [folderId]
            };

            const multipartRequestBody =
                delimiter +
                'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
                JSON.stringify(metadata) +
                delimiter +
                'Content-Type: application/json\r\n\r\n' +
                jsonContent +
                close_delim;

            const createRes = await fetch(
                'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
                {
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'Content-Type': `multipart/related; boundary=${boundary}`,
                    },
                    body: multipartRequestBody
                }
            );

            if (!createRes.ok) {
                throw new Error(`Failed to upload inlay ${id}: ${await createRes.text()}`);
            }

            const createData = await createRes.json();
            // Update cache with new file ID
            if (this.fileIdCache && createData.id) {
                this.fileIdCache.set(id, createData.id);
            }

            Logger.log(`Uploaded inlay ${id} to drive`);
        }
    }

    /**
     * Downloads an inlay from Google Drive
     */
    static async downloadInlay(id: string): Promise<InlayData | null> {
        const folderId = await this.ensureInlayFolder();
        const token = await AuthManager.getAccessToken();

        const fileName = `${id}.json`;
        const fileId = await this.getCachedFileId(id, folderId);

        if (!fileId) {
            Logger.warn(`Inlay ${id} not found in drive`);
            return null;
        }

        const downloadRes = await fetch(
            `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
            {
                headers: { Authorization: `Bearer ${token}` }
            }
        );

        if (!downloadRes.ok) {
            throw new Error(`Failed to download inlay ${id}: ${await downloadRes.text()}`);
        }

        const data = await downloadRes.json();
        Logger.log(`Downloaded inlay ${id} from drive`);
        return data as InlayData;
    }

    /**
     * Deletes an inlay from Google Drive
     */
    static async deleteInlay(id: string): Promise<void> {
        const folderId = await this.ensureInlayFolder();
        const token = await AuthManager.getAccessToken();

        const fileName = `${id}.json`;
        const fileId = await this.getCachedFileId(id, folderId);

        if (!fileId) {
            Logger.warn(`Inlay ${id} not found in drive, nothing to delete`);
            return;
        }

        const deleteRes = await fetch(
            `https://www.googleapis.com/drive/v3/files/${fileId}`,
            {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` }
            }
        );

        if (!deleteRes.ok) {
            throw new Error(`Failed to delete inlay ${id}: ${await deleteRes.text()}`);
        }

        // Remove from cache
        if (this.fileIdCache) {
            this.fileIdCache.delete(id);
        }

        Logger.log(`Deleted inlay ${id} from drive`);
    }

    /**
     * Helper: Get file ID by name in a specific folder
     */
    private static async getFileId(fileName: string, folderId: string): Promise<string | null> {
        const token = await AuthManager.getAccessToken();

        const searchUrl = `https://www.googleapis.com/drive/v3/files?` +
            `q=name='${fileName}' and '${folderId}' in parents and trashed=false` +
            `&spaces=appDataFolder` +
            `&fields=files(id)`;

        const res = await fetch(searchUrl, {
            headers: { Authorization: `Bearer ${token}` }
        });

        if (!res.ok) {
            throw new Error(`Failed to search for file ${fileName}: ${await res.text()}`);
        }

        const data = await res.json();
        return data.files && data.files.length > 0 ? data.files[0].id : null;
    }

    /**
     * Clears the cached folder ID and file ID cache (useful for testing)
     */
    static clearCache(): void {
        this.inlayFolderId = null;
        this.fileIdCache = null;
    }
}
