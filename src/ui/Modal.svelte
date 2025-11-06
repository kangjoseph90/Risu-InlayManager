<script lang="ts">
    import { PLUGIN_NAME } from "../plugin";
    import { AssetTab } from "./tabs";
    import { X } from "lucide-svelte";
    import { onDestroy } from "svelte";
    import { UrlManager } from "../manager/url";

    export let onClose: () => void;

    onDestroy(() => {
        UrlManager.revokeAll()
    });
</script>

<!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
<div
    class="fixed inset-0 bg-black/60 z-50 flex items-center justify-center"
    on:click={onClose}
    on:keydown={(e) => e.key === 'Escape' && onClose()}
    role="button"
    tabindex="0"
>
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <div class="flex justify-center w-full h-full">
        <div class="flex flex-col p-3 sm:p-6 rounded-lg bg-zinc-900 w-full max-w-4xl h-full cursor-default" on:click|stopPropagation role="dialog" aria-modal="true">
            <!-- Header -->
            <div class="flex justify-between items-center w-full mb-2 flex-shrink-0 gap-2 flex-wrap">
                <h2 class="text-lg sm:text-2xl font-semibold text-zinc-100">{PLUGIN_NAME}</h2>
                <div class="flex items-center gap-2 flex-wrap">
                    <button class="p-2 rounded-lg bg-zinc-800 text-zinc-200 hover:bg-zinc-700 transition-colors" title="Close" on:click={onClose}>
                        <X size={20} />
                    </button>
                </div>
            </div>
            
            <!-- Body Container -->
            <div class="flex-1 overflow-y-auto min-h-0 mt-2">
                <AssetTab />
            </div>
        </div>
    </div>
</div>