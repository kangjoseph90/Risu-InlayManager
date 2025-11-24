<script lang="ts">
    import { onMount, onDestroy } from "svelte";
    import { InlayType, type InlayData } from "../../types";
    import { TimeManager } from "../../manager/time";
    import { InlayManager } from "../../manager/inlay";
    import { ChatManager } from "../../manager/chat";
    import { AuthManager, SyncManager } from "../../manager";
    import { RisuAPI } from "../../api";
    import { AssetViewer, AssetPopup } from "../components";
    import VirtualGrid from "../components/VirtualGrid.svelte";
    import { Image, Video, Music, Download, Check, X, Trash2, Filter, ChevronDown } from "lucide-svelte";
    import { DataManager } from "../../manager/data";
    import { Logger } from "../../logger";
    import { alert, confirm } from "../popup";
    
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
    
    // Filter state
    interface CharacterInfo {
        id: string;
        name: string;
        avatarUrl?: string;
    }

    interface ChatInfo {
        id: string;
        name: string;
    }

    let characters: CharacterInfo[] = [];
    let chats: ChatInfo[] = [];

    let selectedCharId: string = "";
    let selectedChatId: string = "";
    
    let showCharDropdown = false;
    let showChatDropdown = false;

    // Touch scroll detection
    let touchStartY = 0;
    let touchStartX = 0;
    let hasMoved = false;
    let longPressCompleted = false; // long press 완료 여부
    const MOVE_THRESHOLD = 10; // 픽셀 - 이 이상 움직이면 스크롤로 간주
    
    $: {
        visibleKeys.clear();
        for (const index of visibleIndices) {
            if (sortedKeys[index]) {
                visibleKeys.add(sortedKeys[index]);
            }
        }
    }
    
    // Watch filter changes
    $: if (selectedCharId !== undefined) {
        selectedChatId = ""; // Reset chat filter when character changes
        loadChatsForCharacter(selectedCharId);
        loadMetadatas();
    }

    $: if (selectedChatId !== undefined) {
        loadMetadatas();
    }
    
    // Handle click outside to close dropdowns
    function handleWindowClick(event: MouseEvent) {
        const target = event.target as HTMLElement;
        if (!target.closest('[data-dropdown="char"]')) {
            showCharDropdown = false;
        }
        if (!target.closest('[data-dropdown="chat"]')) {
            showChatDropdown = false;
        }
    }

    // Functions for selection mode
    function startLongPress(key: string) {
        longPressKey = key;
        longPressCompleted = false;
        longPressTimer = window.setTimeout(() => {
            if (!selectionMode) {
                selectionMode = true;
                selectedAssets.add(key);
                selectedAssets = selectedAssets;
                longPressCompleted = true; // long press 완료 표시
            }
        }, LONG_PRESS_DURATION);
    }
    
    function cancelLongPress() {
        if (longPressTimer) {
            clearTimeout(longPressTimer);
            longPressTimer = null;
        }
        longPressKey = null;
        longPressCompleted = false;
    }
    
    function handleAssetClick(key: string) {
        // 스크롤 중이었으면 클릭 무시
        if (hasMoved) return;
        
        // long press가 완료되었으면 클릭으로 처리하지 않음
        if (longPressCompleted) {
            longPressCompleted = false;
            return;
        }
        
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
    
    function handleTouchStart(key: string, e: TouchEvent) {
        touchStartY = e.touches[0].clientY;
        touchStartX = e.touches[0].clientX;
        hasMoved = false;
        startLongPress(key);
    }
    
    function handleTouchMove(e: TouchEvent) {
        const deltaY = Math.abs(e.touches[0].clientY - touchStartY);
        const deltaX = Math.abs(e.touches[0].clientX - touchStartX);
        
        // 움직임이 threshold 넘으면 스크롤로 간주
        if (deltaY > MOVE_THRESHOLD || deltaX > MOVE_THRESHOLD) {
            hasMoved = true;
            cancelLongPress();
        }
    }
    
    function handleTouchEnd() {
        // long press가 완료되지 않았으면 타이머만 취소
        if (!longPressCompleted) {
            cancelLongPress();
        }
    }
    
    function handleMouseUp(key: string) {
        // 데스크톱에서도 long press 중이 아니면 취소
        if (!longPressCompleted) {
            cancelLongPress();
        }
    }
    
    function handleKeyDown(key: string, e: KeyboardEvent) {
        if (e.key === 'Enter') {
            handleAssetClick(key);
        }
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
                Logger.error(`Failed to download asset ${key}:`, error);
            }
        }
        
        exitSelectionMode();
    }

    async function deleteSelected() {
        if (selectedAssets.size === 0) return;
        
        const isLoggedIn = AuthManager.isLoggedIn();
        let permanentDelete = false;
        
        if (isLoggedIn) {
            // Show options when logged in
            const message = `${selectedAssets.size}개의 에셋을 삭제하시겠습니까?\n\n[확인] - 모든 기기에서 영구 삭제\n[취소] - 이 기기에서만 삭제`;
            permanentDelete = await confirm(message);
            
            // If user clicked cancel on the first dialog, ask for local-only delete
            if (!permanentDelete) {
                const localOnly = await confirm(`이 기기에서만 ${selectedAssets.size}개의 에셋을 삭제하시겠습니까?`);
                if (!localOnly) return; // User cancelled both
            }
        } else {
            // Not logged in, just confirm regular delete
            const confirmed = await confirm(`${selectedAssets.size}개의 에셋을 삭제하시겠습니까?`);
            if (!confirmed) return;
        }
        
        try {
            for (const key of selectedAssets) {
                if (permanentDelete) {
                    // Delete with tombstone (will sync across devices)
                    await InlayManager.deleteInlay(key);
                } else {
                    // Local-only delete: remove tombstone if exists, then delete locally
                    SyncManager.removeDeletedInlay(key);
                    // Use localForage directly to avoid adding tombstone
                    const { default: localForage } = await import('localforage');
                    const db = localForage.createInstance({
                        name: 'inlay',
                        storeName: 'inlay',
                    });
                    await db.removeItem(key);
                }
            }
            
            await loadMetadatas();
            exitSelectionMode();
        } catch (error) {
            Logger.error('Failed to delete assets:', error);
            await alert('에셋 삭제에 실패했습니다.');
        }
    }

    async function loadCharacters() {
        try {
            const charIds = await ChatManager.getCharacters();
            const loadedChars: CharacterInfo[] = [];

            for (const id of charIds) {
                try {
                    const charData = RisuAPI.findCharacterbyId(id);
                    if (charData) {
                         const avatarUrl = await RisuAPI.getCharImage(charData.image, 'plain');
                         loadedChars.push({
                             id,
                             name: charData.name,
                             avatarUrl
                         });
                    } else {
                        // If character not found in current session list, might just show ID or "Unknown"
                         loadedChars.push({
                             id,
                             name: "Unknown Character"
                         });
                    }
                } catch (e) {
                     loadedChars.push({
                             id,
                             name: "Unknown Character"
                     });
                }
            }
            characters = loadedChars;
        } catch (e) {
            Logger.error("Failed to load characters", e);
        }
    }

    async function loadChatsForCharacter(charId: string) {
        if (!charId) {
            chats = [];
            return;
        }
        try {
            const chatIds = await ChatManager.getChats(charId);
            const loadedChats: ChatInfo[] = [];

            // We need to find the character object to access its chats array
            const charData = RisuAPI.findCharacterbyId(charId);

            for (const chatId of chatIds) {
                let chatName = "Unknown Chat";
                if (charData && charData.chats) {
                    const chat = charData.chats.find((c: any) => c.id === chatId);
                    if (chat) {
                        chatName = chat.name || "Untitled Chat"; // Assuming chat has a name property, or use some default
                        // If chat.name is undefined (e.g. newly created), use default
                        // In risu, usually it's `chat.name` or derived from content.
                        // The user prompt said: "const chatName = chat?.name"
                    }
                }
                loadedChats.push({
                    id: chatId,
                    name: chatName
                });
            }
            chats = loadedChats;
        } catch (e) {
             Logger.error("Failed to load chats", e);
        }
    }

    export async function loadMetadatas() {
        const keys = await InlayManager.getKeys();
        const newMap = new Map<string, Date>();
        
        await Promise.all(keys.map(async (key) => {
             // Apply filtering
            if (selectedCharId) {
                const chatData = await ChatManager.getChatData(key);
                if (!chatData || chatData.charId !== selectedCharId) {
                    return;
                }
                if (selectedChatId) {
                    if (chatData.chatId !== selectedChatId) {
                        return;
                    }
                }
            }

            const time = await TimeManager.getTime(key);
            newMap.set(key, time);
        }));

        const sortedArray = Array.from(newMap.entries())
            .sort((a, b) => b[1].getTime() - a[1].getTime());
            
        keyMetaMap = newMap;
        sortedKeys = sortedArray.map(([key, _]) => key);
    }

    export async function reloadFilters() {
        await loadCharacters();
        if (selectedCharId) {
            await loadChatsForCharacter(selectedCharId);
        }
        await loadMetadatas();
    }
    
    onMount(async () => {
        window.addEventListener('click', handleWindowClick);
        await loadCharacters();
        await loadMetadatas();
    });
    
    onDestroy(() => {
        window.removeEventListener('click', handleWindowClick);
        cancelLongPress();
    });
</script>

<div class="flex flex-col h-full">
    <!-- Filter Toolbar -->
    {#if !selectionMode}
        <div class="flex items-center gap-2 py-2 px-4 bg-zinc-800/50 rounded-lg mb-2 flex-wrap z-20 relative">
            <div class="flex items-center gap-2">
                <Filter size={18} class="text-zinc-400" />
                <span class="text-sm font-medium text-zinc-300">필터:</span>
            </div>

            <!-- Character Filter Dropdown -->
            <div class="relative" data-dropdown="char">
                <button
                    class="flex items-center gap-2 bg-zinc-700 hover:bg-zinc-600 text-zinc-200 text-sm rounded px-3 py-1.5 outline-none transition-colors min-w-[150px] justify-between"
                    on:click={() => showCharDropdown = !showCharDropdown}
                >
                    <div class="flex items-center gap-2 overflow-hidden">
                        {#if selectedCharId}
                            {@const selectedChar = characters.find(c => c.id === selectedCharId)}
                            {#if selectedChar?.avatarUrl}
                                <img src={selectedChar.avatarUrl} alt="" class="w-5 h-5 rounded-full object-cover flex-shrink-0" />
                            {/if}
                            <span class="truncate">{selectedChar?.name || 'Unknown Character'}</span>
                        {:else}
                            <span>모든 캐릭터</span>
                        {/if}
                    </div>
                    <ChevronDown size={14} class="text-zinc-400 transition-transform {showCharDropdown ? 'rotate-180' : ''}" />
                </button>
                
                {#if showCharDropdown}
                    <div class="absolute top-full left-0 mt-1 w-64 max-h-80 overflow-y-auto bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl z-30 flex flex-col py-1">
                        <button
                            class="flex items-center gap-2 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-700 hover:text-white text-left transition-colors"
                            class:bg-blue-600={selectedCharId === ""}
                            class:text-white={selectedCharId === ""}
                            on:click={() => { selectedCharId = ""; showCharDropdown = false; }}
                        >
                            <span>모든 캐릭터</span>
                        </button>
                        {#each characters as char}
                            <button
                                class="flex items-center gap-2 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-700 hover:text-white text-left transition-colors"
                                class:bg-blue-600={selectedCharId === char.id}
                                class:text-white={selectedCharId === char.id}
                                on:click={() => { selectedCharId = char.id; showCharDropdown = false; }}
                            >
                                {#if char.avatarUrl}
                                    <img src={char.avatarUrl} alt="" class="w-6 h-6 rounded-full object-cover flex-shrink-0 bg-zinc-900" />
                                {:else}
                                    <div class="w-6 h-6 rounded-full bg-zinc-600 flex-shrink-0"></div>
                                {/if}
                                <span class="truncate">{char.name}</span>
                            </button>
                        {/each}
                    </div>
                {/if}
            </div>

            <!-- Chat Filter Dropdown (Only visible if character is selected) -->
            {#if selectedCharId}
                <div class="relative" data-dropdown="chat">
                    <button
                        class="flex items-center gap-2 bg-zinc-700 hover:bg-zinc-600 text-zinc-200 text-sm rounded px-3 py-1.5 outline-none transition-colors min-w-[150px] justify-between"
                        on:click={() => showChatDropdown = !showChatDropdown}
                    >
                        <div class="flex items-center gap-2 overflow-hidden">
                             <span class="truncate">
                                {selectedChatId ? (chats.find(c => c.id === selectedChatId)?.name || 'Unknown Chat') : 'All Chats'}
                             </span>
                        </div>
                        <ChevronDown size={14} class="text-zinc-400 transition-transform {showChatDropdown ? 'rotate-180' : ''}" />
                    </button>

                    {#if showChatDropdown}
                         <div class="absolute top-full left-0 mt-1 w-64 max-h-80 overflow-y-auto bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl z-30 flex flex-col py-1">
                            <button
                                class="flex items-center gap-2 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-700 hover:text-white text-left transition-colors"
                                class:bg-blue-600={selectedChatId === ""}
                                class:text-white={selectedChatId === ""}
                                on:click={() => { selectedChatId = ""; showChatDropdown = false; }}
                            >
                                <span>모든 채팅</span>
                            </button>
                            {#each chats as chat}
                                <button
                                    class="flex items-center gap-2 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-700 hover:text-white text-left transition-colors"
                                    class:bg-blue-600={selectedChatId === chat.id}
                                    class:text-white={selectedChatId === chat.id}
                                    on:click={() => { selectedChatId = chat.id; showChatDropdown = false; }}
                                >
                                    <span class="truncate">{chat.name}</span>
                                </button>
                            {/each}
                        </div>
                    {/if}
                </div>
            {/if}
        </div>
    {/if}

    <!-- Selection Mode Toolbar -->
    {#if selectionMode}
        <div class="sticky top-0 z-50 bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg mb-2 rounded-lg">
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

    <!-- Content Area -->
    <div class="flex-1 min-h-0">
        {#if sortedKeys.length === 0}
            <div class="flex flex-col items-center justify-center h-full text-zinc-400 p-4">
                <div class="p-6 rounded-full bg-zinc-800/50 mb-4">
                    <Image class="w-16 h-16" />
                </div>
                <p class="text-xl font-semibold text-zinc-300">
                    {#if selectedCharId || selectedChatId}
                        조건에 맞는 에셋이 없습니다
                    {:else}
                        인레이 에셋이 없습니다
                    {/if}
                </p>
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
                        transition-all duration-200 cursor-pointer touch-manipulation
                        {selectionMode ? 'md:hover:scale-95' : 'md:hover:scale-105 md:hover:shadow-2xl md:hover:shadow-blue-500/20'}
                        {selectedAssets.has(key) ? 'ring-4 ring-blue-500 scale-95' : 'md:hover:ring-2 md:hover:ring-blue-400/50'}"
                    on:mousedown={() => startLongPress(key)}
                    on:mouseup={() => handleMouseUp(key)}
                    on:mouseleave={cancelLongPress}
                    on:touchstart={(e) => handleTouchStart(key, e)}
                    on:touchmove={handleTouchMove}
                    on:touchend={handleTouchEnd}
                    on:touchcancel={handleTouchEnd}
                    on:click={() => handleAssetClick(key)}
                    role="button"
                    tabindex="0"
                    on:keydown={(e) => handleKeyDown(key, e)}
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
    </div>
</div>

<!-- Asset Popup -->
{#if showPopup && popupKey}
    <AssetPopup
        currentKey={popupKey}
        allKeys={sortedKeys}
        onClose={closePopup}
    />
{/if}
