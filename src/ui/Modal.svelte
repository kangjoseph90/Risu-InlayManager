<script lang="ts">
    import { InlayType } from "../types";
    import { PLUGIN_NAME } from "../plugin";
    import { AssetTab } from "./tabs";
    import { X, Image, Video, AudioLines } from "lucide-svelte";
    import { onMount, onDestroy } from "svelte";
    import { TypeTracker } from "../tracker/type";
    import { UrlManager } from "../manager/url";

    export let onClose: () => void;

    let currentTab: InlayType = InlayType.Image;

    onMount(async () => {
        await TypeTracker.sync();
    });

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
                    <button class="px-3 py-2 rounded-lg text-xs sm:text-sm whitespace-nowrap {currentTab === InlayType.Image ? 'bg-zinc-700' : 'bg-zinc-800'} text-zinc-200 transition-colors font-medium hover:text-zinc-100 hover:bg-zinc-700 flex items-center gap-1" title="Image" on:click={() => currentTab = InlayType.Image} disabled={currentTab === InlayType.Image}>
                        <Image size={20} />
                        <span>이미지</span>
                    </button>

                    <button class="px-3 py-2 rounded-lg text-xs sm:text-sm whitespace-nowrap {currentTab === InlayType.Video ? 'bg-zinc-700' : 'bg-zinc-800'} text-zinc-200 transition-colors font-medium hover:text-zinc-100 hover:bg-zinc-700 flex items-center gap-1" title="Video" on:click={() => currentTab = InlayType.Video} disabled={currentTab === InlayType.Video}>
                        <Video size={20} />
                        <span>비디오</span>
                    </button>

                    <button class="px-3 py-2 rounded-lg text-xs sm:text-sm whitespace-nowrap {currentTab === InlayType.Audio ? 'bg-zinc-700' : 'bg-zinc-800'} text-zinc-200 transition-colors font-medium hover:text-zinc-100 hover:bg-zinc-700 flex items-center gap-1" title="Audio" on:click={() => currentTab = InlayType.Audio} disabled={currentTab === InlayType.Audio}>
                        <AudioLines size={20} />
                        <span>오디오</span>
                    </button>

                    <button class="p-2 rounded-lg bg-zinc-800 text-zinc-200 hover:bg-zinc-700 transition-colors" title="Close" on:click={onClose}>
                        <X size={20} />
                    </button>
                </div>
            </div>
            
            <!-- Body Container -->
            <div class="flex-1 overflow-y-auto min-h-0 pt-2">
                <AssetTab type={currentTab} />
            </div>
        </div>
    </div>
</div>