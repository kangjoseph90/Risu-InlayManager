<script lang="ts">
    import { onMount, onDestroy } from "svelte";
    import { AuthManager, SyncManager, AutoSyncManager, BackupManager } from "../manager";
    import { DataManager } from "../manager/data";
    import { RisuAPI } from "../api";
    import { SYNC_ENABLED } from "../plugin";
    import { Logger } from "../logger";
    import { alert, confirm } from "./popup";
    import { AssetTab } from "./tabs";
    import { ModalHeader, SyncProgressBar } from "./components";

    export let onClose: () => void;

    let isLoggedIn = false;
    let userProfile: { name: string; picture: string; email: string } | null = null;
    let syncEnabled = false;
    let modalHeader: ModalHeader;
    let assetTab: AssetTab | null = null;
    let fileInput: HTMLInputElement;

    onMount(async () => {
        await checkLoginStatus();
        loadSyncSettings();
    });

    onDestroy(() => {
        DataManager.revokeAll();
    });

    async function checkLoginStatus() {
        isLoggedIn = AuthManager.isLoggedIn();
        if (isLoggedIn) {
            try {
                userProfile = await AuthManager.fetchUserProfile();
            } catch (e) {
                Logger.error("Error checking login status:", e);
                isLoggedIn = false;
            }
        }
    }

    function loadSyncSettings() {
        syncEnabled = (RisuAPI.getArg(SYNC_ENABLED) as number) === 1;
    }

    async function handleLogin() {
        try {
            await AuthManager.login();
            await checkLoginStatus();
        } catch (e) {
            Logger.error("Login failed:", e);
            await alert("Login failed. Please try again.");
        }
    }

    function handleLogout() {
        AuthManager.logout();
        isLoggedIn = false;
        userProfile = null;
        syncEnabled = false;
        RisuAPI.setArg(SYNC_ENABLED, 0);
        
        // Stop auto sync
        const autoSyncManager = AutoSyncManager.getInstance();
        autoSyncManager.stop();
    }

    function handleToggleSync() {
        syncEnabled = !syncEnabled;
        RisuAPI.setArg(SYNC_ENABLED, syncEnabled ? 1 : 0);
        Logger.log(`Sync ${syncEnabled ? 'enabled' : 'disabled'}`);
        
        // Start or stop auto sync
        const autoSyncManager = AutoSyncManager.getInstance();
        if (syncEnabled) {
            autoSyncManager.start();
        } else {
            autoSyncManager.stop();
        }
    }

    async function handleSyncNow(event: CustomEvent<'push' | 'pull' | 'merge'>) {
        const mode = event.detail;
        
        if (!isLoggedIn) {
            await alert("먼저 로그인해주세요.");
            return;
        }

        try {            
            let report;
            if (mode === 'push') {
                report = await SyncManager.pushToCloud();
            } else if (mode === 'pull') {
                report = await SyncManager.pullFromCloud();
            } else {
                report = await SyncManager.mergeSync();
            }

            const message = `동기화 완료!\n\n업로드: ${report.uploaded}\n다운로드: ${report.downloaded}\n삭제: ${report.deleted}\n오류: ${report.errors.length}`;
            
            if (report.errors.length > 0) {
                Logger.error("Sync errors:", report.errors);
            }
            
            // Refresh asset list
            if (assetTab) {
                await assetTab.loadMetadatas();
            }
            
            await alert(message);
        } catch (e) {
            Logger.error("Manual sync failed:", e);
            
            // Show user-friendly message for manual sync
            if (e instanceof Error && e.message === 'Sync already in progress') {
                await alert('동기화가 이미 진행 중입니다. 잠시 후 다시 시도해주세요.');
            } else if (e instanceof Error && e.message === 'Sync cancelled') {
                await alert('동기화가 취소되었습니다.');
            } else {
                await alert(`동기화 실패: ${e}`);
            }
        }
    }

    async function handleCancelSync() {
        try {
            SyncManager.cancelSync();
            Logger.log("Sync cancellation requested");
        } catch (e) {
            Logger.error("Cancel sync failed:", e);
        }
    }

    async function handleBackup(event: CustomEvent<'browser' | 'file'>) {
        const mode = event.detail;

        try {
            if (mode === 'browser') {
                if (!await confirm("백업하시겠습니까? 기존 백업은 덮어씌워집니다.")) {
                    return;
                }
                if (await BackupManager.backup()) {
                    await alert("백업이 완료되었습니다!");
                } else {
                    await alert("백업에 실패했습니다.");
                }
            } else {
                await BackupManager.exportBackupToFile();
            }
        } catch (e) {
            Logger.error("Backup failed:", e);
            await alert(`백업 실패: ${e}`);
        }
    }

    async function handleRestore(event: CustomEvent<'browser' | 'file'>) {
        const mode = event.detail;

        try {
            if (mode === 'browser') {
                if (!await confirm("복원하시겠습니까? 현재 설정이 덮어씌워집니다.")) {
                    return;
                }
                if (await BackupManager.restore()) {
                    await alert("복원이 완료되었습니다!");
                    // Reload settings
                    await checkLoginStatus();
                    loadSyncSettings();
                    modalHeader?.refreshConcurrency();
                    // Reload filters
                    if (assetTab) {
                        await assetTab.reloadFilters();
                    }
                } else {
                    await alert("복원에 실패했습니다. 백업이 없거나 손상되었습니다.");
                }
            } else {
                fileInput.click();
            }
        } catch (e) {
            Logger.error("Restore failed:", e);
            await alert(`복원 실패: ${e}`);
        }
    }

    async function handleFileChange(event: Event) {
        const target = event.target as HTMLInputElement;
        if (!target.files || target.files.length === 0) {
            return;
        }
        const file = target.files[0];

        if (!await confirm("파일에서 복원하시겠습니까? 현재 설정이 덮어씌워집니다.")) {
            target.value = "";
            return;
        }

        try {
            if (await BackupManager.importBackupFromFile(file)) {
                await alert("복원이 완료되었습니다!");
                // Reload settings
                await checkLoginStatus();
                loadSyncSettings();
                modalHeader?.refreshConcurrency();
                // Reload filters
                if (assetTab) {
                    await assetTab.reloadFilters();
                }
            } else {
                await alert("복원에 실패했습니다. 파일이 손상되었거나 호환되지 않습니다.");
            }
        } catch (e) {
            Logger.error("File import failed:", e);
            await alert(`파일 복원 실패: ${e}`);
        }
        
        target.value = ""; // Reset
    }
</script>

<input
    type="file"
    class="hidden"
    bind:this={fileInput}
    on:change={handleFileChange}
    accept=".json"
/>

<!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
<div
    class="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-0 sm:p-4 sm:p-6"
    on:click={onClose}
    on:keydown={(e) => e.key === "Escape" && onClose()}
    role="dialog"
    aria-modal="true"
    tabindex="-1"
>
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <!-- svelte-ignore a11y-no-static-element-interactions -->
    <div
        class="flex flex-col bg-[#1e1e20] w-full h-full sm:h-[90vh] sm:max-w-4xl sm:rounded-xl shadow-2xl border-0 sm:border border-zinc-800 overflow-hidden ring-0 sm:ring-1 ring-white/10 cursor-default"
        on:click|stopPropagation={() => modalHeader?.closeAllDropdowns()}
    >
        <ModalHeader
            bind:this={modalHeader}
            {isLoggedIn}
            {userProfile}
            {syncEnabled}
            on:close={onClose}
            on:login={handleLogin}
            on:logout={handleLogout}
            on:toggleSync={handleToggleSync}
            on:syncNow={handleSyncNow}
            on:backup={handleBackup}
            on:restore={handleRestore}
        />

        <!-- Sync Progress Bar -->
        <SyncProgressBar on:cancel={handleCancelSync} />

        <!-- Body -->
        <div class="flex-1 overflow-y-auto bg-[#1e1e20] p-4">
            <AssetTab bind:this={assetTab} />
        </div>
    </div>
</div>