<script lang="ts">
    import { InlayType } from "../../types";
    import { DataManager } from "../../manager/data";
    import { ChevronLeft, ChevronRight, CircleAlert, X } from "lucide-svelte";
    import { onMount, onDestroy } from "svelte";
    import Loading from "./Loading.svelte";
    import { Logger } from "../../logger";
    
    export let currentKey: string;
    export let allKeys: string[];
    export let onClose: () => void;
    
    let currentIndex = 0;
    let dataURL: string = '';
    let type: InlayType = InlayType.Image;
    let loading = true;
    let error: string | null = null;
    let videoElement: HTMLVideoElement;
    let audioElement: HTMLAudioElement;

    // Swipe gesture tracking
    let touchStartX = 0;
    let touchEndX = 0;
    const SWIPE_THRESHOLD = 50; // pixels
    
    // Load asset data
    async function loadAssetData() {
        try {
            loading = true;
            error = null;
            dataURL = '';
            const data = await DataManager.getData(currentKey);
            if (!data) {
                throw new Error('데이터를 찾을 수 없습니다.');
            }
            dataURL = data.url;
            type = data.type;
        } catch (err) {
            error = err instanceof Error ? err.message : '로드 실패';
            Logger.error(`Failed to load asset ${currentKey}:`, err);
        } finally {
            loading = false;
        }
    }
    
    // Watch for currentKey changes
    $: if (currentKey) {
        loadAssetData();
    }
    
    // Initialize current index and meta
    $: currentIndex = allKeys.indexOf(currentKey);
    
    
    // Navigate to previous asset
    function navigatePrev() {
        if (currentIndex > 0) {
            currentIndex--;
            currentKey = allKeys[currentIndex];
        }
    }
    
    // Navigate to next asset
    function navigateNext() {
        if (currentIndex < allKeys.length - 1) {
            currentIndex++;
            currentKey = allKeys[currentIndex];
        }
    }
    
    // Handle keyboard navigation
    function handleKeydown(e: KeyboardEvent) {
        if (e.key === 'Escape') {
            onClose();
        } else if (e.key === 'ArrowLeft') {
            navigatePrev();
        } else if (e.key === 'ArrowRight') {
            navigateNext();
        }
    }
    
    // Handle background click
    function handleBackgroundClick(e: MouseEvent) {
        if (e.target === e.currentTarget) {
            onClose();
        }
    }
    
    // Handle touch start
    function handleTouchStart(e: TouchEvent) {
        touchStartX = e.touches[0].clientX;
    }
    
    // Handle touch end for swipe detection
    function handleTouchEnd(e: TouchEvent) {
        touchEndX = e.changedTouches[0].clientX;
        handleSwipe();
    }
    
    // Detect swipe direction
    function handleSwipe() {
        const diff = touchStartX - touchEndX;
        
        // Swiped left (show next)
        if (diff > SWIPE_THRESHOLD) {
            navigateNext();
        }
        // Swiped right (show previous)
        else if (diff < -SWIPE_THRESHOLD) {
            navigatePrev();
        }
    }

    onMount(() => {
        window.addEventListener('keydown', handleKeydown);
        document.body.style.overflow = 'hidden';
    });
    
    onDestroy(() => {
        window.removeEventListener('keydown', handleKeydown);
        document.body.style.overflow = '';
    });
</script>

<!-- Popup Overlay -->
<!-- svelte-ignore a11y-click-events-have-key-events -->
<!-- svelte-ignore a11y-no-static-element-interactions -->
<!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
<div
    class="fixed inset-0 bg-black/60 z-50 flex items-center justify-center"
    on:click={handleBackgroundClick}
    on:touchstart={handleTouchStart}
    on:touchend={handleTouchEnd}
    role="button"
    tabindex="0"
>
    <button
        class="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 
               transition-colors text-white z-20" on:click|stopPropagation={onClose} aria-label="Close popup"
    >
        <X class="w-6 h-6" />
    </button>
    
    <div class="max-w-6xl w-full max-h-[90vh] flex items-center justify-center p-4 sm:p-8 pointer-events-none">
        <div 
            class="flex items-center justify-center pointer-events-auto max-w-full max-h-full cursor-default" 
            on:click|stopPropagation
        >
            {#if loading}
                <Loading size="large" />
            {:else if error}
                <div class="w-full h-full flex flex-col items-center justify-center text-red-400 gap-2">
                    <CircleAlert size={48} />
                    <span class="text-sm">{error}</span>
                </div>
            {:else if dataURL}
                {#if type === InlayType.Audio}
                    <div class="w-96 bg-zinc-900 rounded-2xl shadow-2xl">
                        <audio
                            bind:this={audioElement}
                            src={dataURL}
                            controls
                            autoplay={false}
                            class="w-full"
                        >
                            브라우저가 오디오를 지원하지 않습니다.
                        </audio>
                    </div>
                {:else if type === InlayType.Video}
                    <!-- svelte-ignore a11y-media-has-caption -->
                    <video
                        bind:this={videoElement}
                        src={dataURL}
                        controls
                        autoplay={false}
                        class="max-w-full max-h-[85vh]"
                    >
                        브라우저가 동영상을 지원하지 않습니다.
                    </video>
                {:else if type === InlayType.Image}
                    <img
                        src={dataURL}
                        alt="Asset"
                        class="max-w-full max-h-[85vh] object-contain"
                    />
                {/if}
            {/if}
        </div>
    </div>
    
    <div class="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center justify-center gap-4 z-10">
        <button
            class="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors text-white"
            on:click|stopPropagation={navigatePrev}
            aria-label="Previous asset"
            class:invisible={currentIndex === 0} >
            <ChevronLeft class="w-6 h-6" />
        </button>
    
        <div class="px-4 py-2 rounded-full bg-black/60 backdrop-blur-sm text-white text-sm font-medium">
            {currentIndex + 1} / {allKeys.length}
        </div>
    
        <button
            class="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors text-white"
            on:click|stopPropagation={navigateNext}
            aria-label="Next asset"
            class:invisible={currentIndex >= allKeys.length - 1} >
            <ChevronRight class="w-6 h-6" />
        </button>
    </div>
</div>