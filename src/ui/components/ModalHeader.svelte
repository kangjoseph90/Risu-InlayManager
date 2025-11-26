<script lang="ts">
    import { createEventDispatcher, onMount, onDestroy } from "svelte";
    import { X, Upload, Download, Settings, Loader2 } from "lucide-svelte";
    import { PLUGIN_NAME } from "../../plugin";
    import { SyncManager } from "../../manager";

    export let isLoggedIn: boolean = false;
    export let userProfile: { name: string; picture: string; email: string } | null = null;
    export let syncEnabled: boolean = false;

    const dispatch = createEventDispatcher();
    
    // Concurrency setting (range: 3-15)
    let concurrency = SyncManager.getConcurrency();
    
    function handleConcurrencyChange(event: Event) {
        const target = event.target as HTMLInputElement;
        concurrency = parseInt(target.value);
        SyncManager.setConcurrency(concurrency);
    }

    let showProfileDropdown = false;
    let showSettingsDropdown = false;
    let backupOptionsExpanded = false;
    let restoreOptionsExpanded = false;
    let isSyncing = false;
    let syncCheckInterval: number | null = null;

    export function closeAllDropdowns() {
        showProfileDropdown = false;
        showSettingsDropdown = false;
        backupOptionsExpanded = false;
        restoreOptionsExpanded = false;
    }

    export function refreshConcurrency() {
        concurrency = SyncManager.getConcurrency();
    }

    function toggleBackupOptions() {
        backupOptionsExpanded = !backupOptionsExpanded;
        restoreOptionsExpanded = false;
    }

    function toggleRestoreOptions() {
        restoreOptionsExpanded = !restoreOptionsExpanded;
        backupOptionsExpanded = false;
    }

    function checkSyncStatus() {
        isSyncing = SyncManager.isSyncInProgress();
    }

    onMount(() => {
        // Check sync status every 500ms
        syncCheckInterval = window.setInterval(checkSyncStatus, 500);
    });

    onDestroy(() => {
        if (syncCheckInterval !== null) {
            clearInterval(syncCheckInterval);
        }
    });
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<!-- svelte-ignore a11y-no-static-element-interactions -->
<div
    class="flex flex-col sm:flex-row items-start sm:items-center justify-between px-4 sm:px-6 py-3 bg-[#252528] border-b border-zinc-800 select-none shadow-2xl gap-4 sm:gap-0"
    on:click|stopPropagation={closeAllDropdowns}
>
    <div class="flex items-center gap-4">
        <div class="p-2 bg-blue-500/10 rounded-lg shrink-0">
            <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-6 w-6 text-blue-400"
                fill="currentColor"
                viewBox="0 0 24 24"
            >
                <path
                    d="M3 4v16a1 1 0 001 1h16a1 1 0 001-1V4a1 1 0 00-1-1H4a1 1 0 00-1 1zm2 1h14v14H5V5zm3 3v2h2V8H8zm4 0v2h4V8h-4zM8 12v2h2v-2H8zm4 0v2h4v-2h-4zm-4 4v2h8v-2H8z"
                />
            </svg>
        </div>
        <div>
            <h2 class="text-lg font-bold text-zinc-100 tracking-tight">
                {PLUGIN_NAME}
            </h2>
        </div>
    </div>

    <div class="flex items-center gap-2 sm:gap-3 w-full sm:w-auto justify-end">
        {#if isLoggedIn && userProfile}
            <div class="relative">
                <button
                    class="flex items-center gap-3 pl-4 pr-1 py-1 rounded-full hover:bg-zinc-700/50 transition-all duration-200 group"
                    on:click|stopPropagation={() => {
                        const wasOpen = showProfileDropdown;
                        closeAllDropdowns();
                        showProfileDropdown = !wasOpen;
                    }}
                >
                    <span
                        class="text-sm font-medium text-zinc-300 group-hover:text-white transition-colors hidden sm:block"
                        >{userProfile.name}</span
                    >
                    <div class="relative">
                        <img
                            src={userProfile.picture}
                            alt="Profile"
                            class="w-8 h-8 rounded-full ring-2 ring-zinc-700 group-hover:ring-blue-500/50 transition-all"
                        />
                        {#if isSyncing}
                            <div class="absolute -top-0.5 -right-0.5 w-3 h-3 bg-blue-500 rounded-full flex items-center justify-center">
                                <Loader2 class="w-2 h-2 text-white animate-spin" />
                            </div>
                        {/if}
                    </div>
                </button>

                {#if showProfileDropdown}
                    <div
                        class="absolute right-0 mt-2 w-64 bg-[#252528] rounded-xl shadow-xl border border-zinc-700/50 z-50 animate-in fade-in zoom-in-95 duration-100"
                        on:click|stopPropagation
                    >
                        <div class="px-5 py-3 border-b border-zinc-700/50">
                            <p class="text-sm font-semibold text-white">
                                {userProfile.name}
                            </p>
                            <p class="text-xs text-zinc-400 mt-0.5">
                                {userProfile.email}
                            </p>
                        </div>
                        <!-- Sync Menu -->
                        <div class="px-4 py-3 border-b border-zinc-700/50 space-y-3">
                            <div class="flex items-center justify-between">
                                <span class="text-sm font-medium text-zinc-300">자동 동기화</span>
                                <button
                                    class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors {syncEnabled ? 'bg-blue-600' : 'bg-zinc-700'}"
                                    on:click={() => dispatch('toggleSync')}
                                >
                                    <span class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform {syncEnabled ? 'translate-x-6' : 'translate-x-1'}"></span>
                                </button>
                            </div>
                            <div class="space-y-1.5">
                                <div class="flex items-center justify-between">
                                    <span class="text-sm font-medium text-zinc-300">동기화 속도</span>
                                    <span class="text-xs text-zinc-500">{concurrency}</span>
                                </div>
                                <input
                                    type="range"
                                    min="3"
                                    max="15"
                                    bind:value={concurrency}
                                    on:change={handleConcurrencyChange}
                                    class="w-full h-1.5 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                                />
                                <div class="flex justify-between text-xs text-zinc-500">
                                    <span>안정</span>
                                    <span>빠름</span>
                                </div>
                            </div>
                        </div>
                        <button
                            class="w-full text-left px-4 py-2.5 text-sm text-zinc-300 hover:bg-blue-600 hover:text-white transition-colors flex items-center gap-2"
                            on:click={() => {
                                dispatch('syncNow', 'push');
                                closeAllDropdowns();
                            }}
                        >
                            <Upload size={16} />
                            드라이브에 업로드
                        </button>
                        <button
                            class="w-full text-left px-4 py-2.5 text-sm text-zinc-300 hover:bg-blue-600 hover:text-white transition-colors flex items-center gap-2"
                            on:click={() => {
                                dispatch('syncNow', 'pull');
                                closeAllDropdowns();
                            }}
                        >
                            <Download size={16} />
                            드라이브에서 다운로드
                        </button>
                        <button
                            class="w-full text-left px-4 py-2.5 text-sm text-zinc-300 hover:bg-blue-600 hover:text-white transition-colors flex items-center gap-2"
                            on:click={() => {
                                dispatch('syncNow', 'merge');
                                closeAllDropdowns();
                            }}
                        >
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                            </svg>
                            드라이브와 병합
                        </button>
                    

                        <div class="border-t border-zinc-700/50 py-2 px-2">
                            <button
                                class="w-full text-left px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 rounded-lg transition-colors flex items-center gap-2"
                                on:click={() => dispatch("logout")}
                            >
                                <svg
                                    class="w-4 h-4"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                    ><path
                                        stroke-linecap="round"
                                        stroke-linejoin="round"
                                        stroke-width="2"
                                        d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                                    ></path></svg
                                >
                                로그아웃
                            </button>
                        </div>
                    </div>
                {/if}
            </div>
        {:else}
            <button
                class="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-all shadow-lg shadow-blue-900/20"
                on:click={() => dispatch("login")}
            >
                <svg class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12.545,10.239v3.821h5.445c-0.712,2.315-2.647,3.972-5.445,3.972c-3.332,0-6.033-2.701-6.033-6.032s2.701-6.032,6.033-6.032c1.498,0,2.866,0.549,3.921,1.453l2.814-2.814C17.503,2.988,15.139,2,12.545,2C7.021,2,2.543,6.477,2.543,12s4.478,10,10.002,10c8.396,0,10.249-7.85,9.426-11.748L12.545,10.239z" />
                </svg>
                <span class="hidden sm:inline">로그인</span>
            </button>
        {/if}

        <!-- Settings Dropdown -->
        <div class="relative">
            <button
                class="p-2 text-zinc-400 hover:text-white hover:bg-zinc-700/50 rounded-lg transition-all duration-200"
                on:click|stopPropagation={() => {
                    const wasOpen = showSettingsDropdown;
                    closeAllDropdowns();
                    showSettingsDropdown = !wasOpen;
                }}
                title="설정"
            >
                <Settings size={20} />
            </button>

            {#if showSettingsDropdown}
                <div
                    class="absolute right-0 mt-2 p-2 w-56 bg-zinc-800 rounded-lg shadow-xl flex flex-col gap-1 text-zinc-100 border border-zinc-700/60 z-50"
                    on:click|stopPropagation
                >
                    <!-- Backup -->
                    <button
                        class="flex items-center gap-2 px-3 py-2 rounded-lg {backupOptionsExpanded ? 'bg-zinc-700' : ''} hover:bg-zinc-700 text-zinc-200 transition-colors text-sm w-full justify-start"
                        on:click={toggleBackupOptions}
                    >
                        <Upload size={16} />
                        <span>백업</span>
                    </button>
                    {#if backupOptionsExpanded}
                        <div class="space-y-1 pl-4">
                            <button
                                class="w-full text-left px-2 py-1.5 rounded text-xs transition-colors text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200"
                                on:click={() => {
                                    dispatch('backup', 'browser');
                                    closeAllDropdowns();
                                }}
                            >브라우저에 백업</button>
                            <button
                                class="w-full text-left px-2 py-1.5 rounded text-xs transition-colors text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200"
                                on:click={() => {
                                    dispatch('backup', 'file');
                                    closeAllDropdowns();
                                }}
                            >파일로 내보내기</button>
                        </div>
                    {/if}

                    <!-- Restore -->
                    <button
                        class="flex items-center gap-2 px-3 py-2 rounded-lg {restoreOptionsExpanded ? 'bg-zinc-700' : ''} hover:bg-zinc-700 text-zinc-200 transition-colors text-sm w-full justify-start"
                        on:click={toggleRestoreOptions}
                    >
                        <Download size={16} />
                        <span>복원</span>
                    </button>
                    {#if restoreOptionsExpanded}
                        <div class="space-y-1 pl-4">
                            <button
                                class="w-full text-left px-2 py-1.5 rounded text-xs transition-colors text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200"
                                on:click={() => {
                                    dispatch('restore', 'browser');
                                    closeAllDropdowns();
                                }}
                            >브라우저에서 복원</button>
                            <button
                                class="w-full text-left px-2 py-1.5 rounded text-xs transition-colors text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200"
                                on:click={() => {
                                    dispatch('restore', 'file');
                                    closeAllDropdowns();
                                }}
                            >파일에서 가져오기</button>
                        </div>
                    {/if}
                </div>
            {/if}
        </div>

        <button
            class="p-2 text-zinc-400 hover:text-white hover:bg-zinc-700/50 rounded-lg transition-all duration-200 ml-1"
            on:click={() => dispatch("close")}
        >
            <X size={20} />
        </button>
    </div>
</div>
