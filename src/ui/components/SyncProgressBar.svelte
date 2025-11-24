<script lang="ts">
    import { onMount, onDestroy } from "svelte";
    import { SyncManager, type SyncProgress } from "../../manager";
    import { X } from "lucide-svelte";
    import { createEventDispatcher } from "svelte";

    const dispatch = createEventDispatcher();

    let progress: SyncProgress | null = null;
    let progressCheckInterval: number | null = null;

    function updateProgress() {
        if (SyncManager.isSyncInProgress()) {
            progress = SyncManager.getProgress();
        } else {
            progress = null;
        }
    }

    function handleCancel() {
        SyncManager.cancelSync();
        dispatch('cancel');
    }

    function getPhaseLabel(phase: string): string {
        switch (phase) {
            case 'preparing': return '준비 중';
            case 'uploading': return '업로드 중';
            case 'downloading': return '다운로드 중';
            case 'deleting': return '삭제 중';
            case 'complete': return '완료';
            default: return phase;
        }
    }

    function formatBytes(bytes: number): string {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
    }

    onMount(() => {
        progressCheckInterval = window.setInterval(updateProgress, 200);
    });

    onDestroy(() => {
        if (progressCheckInterval !== null) {
            clearInterval(progressCheckInterval);
        }
    });
</script>

{#if progress && progress.phase !== 'complete'}
    <div class="w-full bg-[#1e1e20] border-b border-zinc-800 px-4 py-2">
        <div class="flex items-center justify-between mb-1">
            <div class="flex items-center gap-2">
                <span class="text-xs font-medium text-zinc-300">
                    {getPhaseLabel(progress.phase)}
                </span>
                {#if progress.total > 0}
                    <span class="text-xs text-zinc-500">
                        {progress.current} / {progress.total}
                    </span>
                {/if}
            </div>
            <button
                class="p-1 hover:bg-zinc-700/50 rounded transition-colors"
                on:click={handleCancel}
                title="취소"
            >
                <X size={14} class="text-zinc-400" />
            </button>
        </div>

        <div class="flex items-center gap-2">
            <div class="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                <div
                    class="h-full bg-blue-500 transition-all duration-300 ease-out rounded-full"
                    style="width: {progress.total > 0 ? (progress.current / progress.total) * 100 : 0}%"
                ></div>
            </div>
        </div>

        {#if progress.currentFileName}
            <div class="mt-1 text-xs text-zinc-500 truncate">
                {progress.currentFileName}
            </div>
        {/if}

        {#if progress.totalBytes > 0}
            <div class="mt-1 text-xs text-zinc-500">
                {formatBytes(progress.bytesTransferred)} / {formatBytes(progress.totalBytes)}
            </div>
        {/if}
    </div>
{/if}
