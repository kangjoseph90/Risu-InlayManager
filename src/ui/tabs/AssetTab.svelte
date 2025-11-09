<script lang="ts">
    import { onMount, onDestroy } from "svelte";
    import { InlayType, type InlayData } from "../../types";
    import { TimeManager } from "../../manager/time";
    import { InlayManager } from "../../manager/inlay";
    import { AssetViewer, AssetPopup } from "../components";
    import VirtualGrid from "../components/VirtualGrid.svelte";
    import { Image, Video, Music, Download, Check, X, Trash2 } from "lucide-svelte";
    import { DataManager } from "../../manager/data";
    
    // Selection mode state
    let selectionMode = false;
    let selectedAssets = new Set<string>();
    let longPressTimer: number | null = null;
    let longPressKey: string | null = null;
    const LONG_PRESS_DURATION = 500; // ms
    
    // Popup state
    let showPopup = false;
    let popupKey: string = '';
    
    let keyMetaMap = new Map<string, Date>();
    let sortedKeys: string[] = [];
    
    // Virtual grid state
    let virtualGrid: any;
    let visibleIndices = new Set<number>();
    let visibleKeys = new Set<string>();
    
    $: {
        visibleKeys.clear();
        for (const index of visibleIndices) {
            if (sortedKeys[index]) {
                visibleKeys.add(sortedKeys[index]);
            }
        }
    }
    
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

    
    async function downloadSelected() {
        if (selectedAssets.size === 0) return;
        
        for (const key of selectedAssets) {
            try {
                const url = await DataManager.getDataURL(key);
                if (!url) {
                    throw new Error('데이터를 찾을 수 없습니다.');
                }
                const link = document.createElement('a');
                link.href = url;
                link.download = `asset_${key}`;
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

    async function deleteSelected() {
        if (selectedAssets.size === 0) return;
        
        const confirmed = confirm(`${selectedAssets.size}개의 에셋을 삭제하시겠습니까?`);
        if (!confirmed) return;
        
        try {
            for (const key of selectedAssets) {
                await InlayManager.deleteInlay(key);
            }
            
            await loadMetadatas();
            exitSelectionMode();
        } catch (error) {
            console.error('Failed to delete assets:', error);
            alert('에셋 삭제에 실패했습니다.');
        }
    }

    async function loadMetadatas() {
        const keys = await InlayManager.getKeys();
        const newMap = new Map<string, Date>();
        
        await Promise.all(keys.map(async (key) => {
            const time = await TimeManager.getTime(key);
            newMap.set(key, time);
        }));

        const sortedArray = Array.from(newMap.entries())
            .sort((a, b) => b[1].getTime() - a[1].getTime());
            
        keyMetaMap = newMap;
        sortedKeys = sortedArray.map(([key, _]) => key);
    }
    
    onMount(async () => {
        await loadMetadatas();
    });
    
    onDestroy(() => {
        cancelLongPress();
    });
</script>

<!-- Selection Mode Toolbar -->
{#if selectionMode}
    <div class="sticky top-0 z-50 bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg">
        <div class="flex items-center justify-between px-4 py-2">
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
            <div class="flex items-center gap-2">
                <button 
                    on:click={deleteSelected}
                    disabled={selectedAssets.size === 0}
                    class="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg 
                           hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed
                           font-medium shadow-md"
                >
                    <Trash2 class="w-5 h-5" />
                    삭제
                </button>
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
    </div>
{/if}

{#if sortedKeys.length === 0}
    <div class="flex flex-col items-center justify-center min-h-[400px] text-zinc-400 p-4">
        <div class="p-6 rounded-full bg-zinc-800/50 mb-4">
            <Image class="w-16 h-16" />
        </div>
        <p class="text-xl font-semibold text-zinc-300">인레이 에셋이 없습니다</p>
    </div>
{:else}
    <VirtualGrid 
        bind:this={virtualGrid}
        bind:visibleIndices={visibleIndices}
        items={sortedKeys} 
        itemHeight={200} 
        let:item 
    >
        {@const key = item}
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
        >
            <!-- Asset Viewer with Lazy Loading -->
            <AssetViewer
                {key}
                width="w-full"
                height="h-full"
                showControls={false}
                isVisible={visibleKeys.has(key)}
            />

            <!-- Selection Checkmark -->
            {#if selectionMode}
                <div class="absolute top-2 right-2 z-10">
                    {#if selectedAssets.has(key)}
                        <div class="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center shadow-lg">
                            <Check class="w-6 h-6 text-white" />
                        </div>
                    {:else}
                        <div class="w-8 h-8 rounded-full border-2 border-white bg-black/30 backdrop-blur-sm" />
                    {/if}
                </div>
            {/if}
        </div>
    </VirtualGrid>
{/if}

<!-- Asset Popup -->
{#if showPopup && popupKey}
    <AssetPopup
        currentKey={popupKey}
        allKeys={sortedKeys}
        onClose={closePopup}
    />
{/if}