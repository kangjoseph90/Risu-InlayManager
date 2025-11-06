<script lang="ts">
    import { onMount, onDestroy } from "svelte";
    import { InlayType, type InlayData } from "../../types";
    import { TimeManager } from "../../manager/time";
    import { InlayManager } from "../../manager/inlay";
    import { UrlManager } from "../../manager/url";
    import { AssetViewer, AssetPopup } from "../components";
    import { Image, Video, Music, Download, CheckCircle2, X } from "lucide-svelte";
    
    // Selection mode state
    let selectionMode = false;
    let selectedAssets = new Set<string>();
    let longPressTimer: number | null = null;
    let longPressKey: string | null = null;
    const LONG_PRESS_DURATION = 500; // ms
    
    // Popup state
    let showPopup = false;
    let popupKey: string = '';
    
    let keyMetaMap = new Map<string, { time: Date, type: InlayType }>();
    let sortedKeys: string[] = [];
    
    // Lazy loading state 
    let visibleKeys = new Set<string>();
    let intersectionObserver: IntersectionObserver;
    
    // Functions for selection mode
    function startLongPress(key: string) {
        longPressKey = key;
        longPressTimer = window.setTimeout(() => {
            if (!selectionMode) {
                selectionMode = true;
                selectedAssets.add(key);
                selectedAssets = selectedAssets;
            }
        }, LONG_PRESS_DURATION);
    }
    
    function cancelLongPress() {
        if (longPressTimer) {
            clearTimeout(longPressTimer);
            longPressTimer = null;
        }
        longPressKey = null;
    }
    
    function handleAssetClick(key: string) {
        cancelLongPress();
        
        if (selectionMode) {
            toggleAssetSelection(key);
        } else {
            // Open popup in normal mode
            popupKey = key;
            showPopup = true;
        }
    }
    
    function closePopup() {
        showPopup = false;
    }
    
    function toggleAssetSelection(key: string) {
        if (selectedAssets.has(key)) {
            selectedAssets.delete(key);
        } else {
            selectedAssets.add(key);
        }
        selectedAssets = selectedAssets;
    }
    
    function exitSelectionMode() {
        selectionMode = false;
        selectedAssets.clear();
        selectedAssets = selectedAssets;
    }
    
    // Setup Intersection Observer for lazy loading
    function setupIntersectionObserver(containerElement: HTMLDivElement) {
        // Stop observing old elements
        if (intersectionObserver) {
            intersectionObserver.disconnect();
        }
        
        const options = {
            root: null,
            rootMargin: '150px', // Start loading 150px before/after viewport
            threshold: 0
        };
        
        intersectionObserver = new IntersectionObserver((entries) => {
            for (const entry of entries) {
                const key = entry.target.getAttribute('data-key');
                if (!key) continue;
                
                if (entry.isIntersecting) {
                    visibleKeys.add(key);
                } else {
                    visibleKeys.delete(key);
                }
                visibleKeys = visibleKeys; // Trigger reactivity
            }
        }, options);
    }
    
    // Function to observe a single asset element (Svelte action)
    function observeAssetElement(element: HTMLElement) {
        if (intersectionObserver && element) {
            intersectionObserver.observe(element);
        }
        
        return {
            destroy() {
                if (intersectionObserver && element) {
                    intersectionObserver.unobserve(element);
                }
            }
        };
    }
    
    async function downloadSelected() {
        if (selectedAssets.size === 0) return;
        
        for (const key of selectedAssets) {
            try {
                const dataURL = await UrlManager.getDataURL(key);
                const link = document.createElement('a');
                link.href = dataURL;
                link.download = `asset_${key}_${Date.now()}`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                
                // Small delay between downloads
                await new Promise(resolve => setTimeout(resolve, 100));
            } catch (error) {
                console.error(`Failed to download asset ${key}:`, error);
            }
        }
        
        exitSelectionMode();
    }

    async function loadMetadatas() {
        const keys = await InlayManager.getKeys();
        const newMap = new Map<string, { time: Date, type: InlayType }>();
        
        for (const key of keys) {
            const time = await TimeManager.getTime(key);
            const inlayData = await InlayManager.getInlayData(key);
            const type = inlayData?.type ?? InlayType.Image;
            newMap.set(key, { time, type });
        }
        
        const sortedArray = Array.from(newMap.entries())
            .sort((a, b) => b[1].time.getTime() - a[1].time.getTime());
            
        keyMetaMap = newMap;
        sortedKeys = sortedArray.map(([key, _]) => key);
    }
    
    onMount(async () => {
        await loadMetadatas();
    });
    
    onDestroy(() => {
        cancelLongPress();
        if (intersectionObserver) {
            intersectionObserver.disconnect();
        }
    });
</script>

<!-- Selection Mode Toolbar -->
{#if selectionMode}
    <div class="sticky top-0 z-50 bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg">
        <div class="flex items-center justify-between px-4 py-3">
            <div class="flex items-center gap-3">
                <button 
                    on:click={exitSelectionMode}
                    class="p-2 hover:bg-white/10 rounded-lg transition-colors"
                    aria-label="Exit selection mode"
                >
                    <X class="w-5 h-5" />
                </button>
                <span class="font-semibold text-lg">
                    {selectedAssets.size}개 선택됨
                </span>
            </div>
            <button 
                on:click={downloadSelected}
                disabled={selectedAssets.size === 0}
                class="flex items-center gap-2 px-4 py-2 bg-white text-blue-600 rounded-lg 
                       hover:bg-blue-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed
                       font-medium shadow-md"
            >
                <Download class="w-5 h-5" />
                다운로드
            </button>
        </div>
    </div>
{/if}

<div 
    class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 p-4"
    use:setupIntersectionObserver
>
    {#each sortedKeys as key (key)}
        {@const meta = keyMetaMap.get(key)}
        {#if meta}
            <div
                data-asset-item
                data-key={key}
                class="group relative aspect-square bg-zinc-900 rounded-xl overflow-hidden
                       transition-all duration-200 cursor-pointer
                       {selectionMode ? 'hover:scale-95' : 'hover:scale-105 hover:shadow-2xl hover:shadow-blue-500/20'}
                       {selectedAssets.has(key) ? 'ring-4 ring-blue-500 scale-95' : 'hover:ring-2 hover:ring-blue-400/50'}"
                on:mousedown={() => startLongPress(key)}
                on:mouseup={cancelLongPress}
                on:mouseleave={cancelLongPress}
                on:touchstart={() => startLongPress(key)}
                on:touchend={cancelLongPress}
                on:touchcancel={cancelLongPress}
                on:click={() => handleAssetClick(key)}
                role="button"
                tabindex="0"
                on:keydown={(e) => e.key === 'Enter' && handleAssetClick(key)}
                use:observeAssetElement
            >
                <!-- Asset Viewer with Lazy Loading -->
                <AssetViewer
                    {key}
                    type={meta.type}
                    width="w-full"
                    height="h-full"
                    objectFit={meta.type === InlayType.Audio ? "object-contain" : "object-cover"}
                    showControls={false}
                    isVisible={visibleKeys.has(key)}
                />

                <!-- Gradient Overlay for better icon visibility -->
                {#if meta.type !== InlayType.Image && !selectionMode && visibleKeys.has(key)}
                    <div class="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent 
                                opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                {/if}

                <!-- Selection Checkmark -->
                {#if selectionMode}
                    <div class="absolute top-2 right-2 z-10">
                        {#if selectedAssets.has(key)}
                            <div class="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center shadow-lg">
                                <CheckCircle2 class="w-6 h-6 text-white" />
                            </div>
                        {:else}
                            <div class="w-8 h-8 rounded-full border-2 border-white bg-black/30 backdrop-blur-sm" />
                        {/if}
                    </div>
                {/if}

                <!-- Type Badge -->
                {#if !selectionMode && visibleKeys.has(key)}
                    <div class="absolute bottom-2 left-2 px-2 py-1 rounded-md bg-black/50 backdrop-blur-sm
                                opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        {#if meta.type === InlayType.Image}
                            <Image class="w-4 h-4 text-white" />
                        {:else if meta.type === InlayType.Video}
                            <Video class="w-4 h-4 text-white" />
                        {:else if meta.type === InlayType.Audio}
                            <Music class="w-4 h-4 text-white" />
                        {/if}
                    </div>
                {/if}
            </div>
        {/if}
    {:else}
        <div class="col-span-full flex flex-col items-center justify-center min-h-[400px] text-zinc-400">
            <div class="p-6 rounded-full bg-zinc-800/50 mb-4">
                <Image class="w-16 h-16" />
            </div>
            <p class="text-xl font-semibold text-zinc-300">인레이 에셋이 없습니다</p>
        </div>
    {/each}
</div>

<!-- Asset Popup -->
{#if showPopup && popupKey}
    <AssetPopup
        currentKey={popupKey}
        allKeys={sortedKeys}
        {keyMetaMap}
        onClose={closePopup}
    />
{/if}