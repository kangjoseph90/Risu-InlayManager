<script lang="ts">
    // ... (스크립트 태그의 윗부분은 기존과 동일합니다) ...
    import { onMount, onDestroy } from "svelte";
    import { InlayType, type InlayData } from "../../types";
    import { TimeManager, TypeManager } from "../../manager/meta";
    import { InlayManager } from "../../manager/inlay";
    import { UrlManager } from "../../manager/url";
    import { InlayEventSystem, InlayEventType } from "../../events/inlay";
    import AssetViewer from "../components/AssetViewer.svelte";
    import { Image, Video, Music } from "lucide-svelte";
    
    export let type: InlayType;
    
    // 1. key -> time 조회용 Map (해시 맵)
    let keyTimeMap = new Map<string, Date>();
    
    // 2. time으로 정렬된 key 배열 (정렬된 리스트) - Svelte가 이 배열을 {#each}로 순회
    let sortedKeys: string[] = [];
    
    $: if (type) {
        loadMetadatas();
    }
    
    /**
     * 이진 탐색을 사용해 정렬된 배열(sortedKeys)에
     * 새 key가 들어갈 위치(인덱스)를 찾습니다.
     * (내림차순, 즉 최신 날짜가 앞)
     */
    function findInsertIndex(key: string, time: Date): number {
        const timeValue = time.getTime();
        let left = 0;
        let right = sortedKeys.length;
        
        while (left < right) {
            const mid = Math.floor((left + right) / 2);
            const midKey = sortedKeys[mid];
            const midTime = keyTimeMap.get(midKey)?.getTime() ?? 0;
            
            // 새 시간이 더 예전(작음)이면 mid보다 뒤(오른쪽)로 가야 함
            if (timeValue <= midTime) {
                left = mid + 1;
            } else {
                right = mid;
            }
        }
        return left; // 'left'가 삽입 위치
    }
    
    async function loadMetadatas() {
        const keys = await TypeManager.getKeys(type);
        const newMap = new Map<string, Date>();
        
        for (const key of keys) {
            const time = await TimeManager.getTime(key);
            newMap.set(key, time ?? new Date(0));
        }
        
        // (O(n log n)) - 초기 로드는 어쩔 수 없음
        const sortedArray = Array.from(newMap.entries())
            .sort((a, b) => b[1].getTime() - a[1].getTime());
            
        // 두 개의 상태를 한 번에 업데이트
        keyTimeMap = newMap;
        sortedKeys = sortedArray.map(([key, _]) => key); // Svelte 반응성 트리거
    }
    
    async function handleDataAdded(data: { key: string, type: InlayType }) {
        if (data.type !== type || keyTimeMap.has(data.key)) return;
        
        const time = await TimeManager.getTime(data.key) ?? new Date(0);
        
        // 1. 맵에 추가 (O(1))
        keyTimeMap.set(data.key, time);
        
        // 2. 정렬된 배열(sortedKeys)에 삽입할 위치 찾기 (O(log n))
        const index = findInsertIndex(data.key, time);
        
        // 3. 배열에 삽입 (O(n))
        sortedKeys.splice(index, 0, data.key);
        sortedKeys = sortedKeys; // Svelte 반응성 트리거
    }
    
    async function handleDataRemoved(data: { key: string, type: InlayType }) {
        if (data.type !== type || !keyTimeMap.has(data.key)) return;
        
        // 1. 맵에서 제거 (O(1))
        keyTimeMap.delete(data.key);
        
        // 2. 정렬된 배열에서 제거 (O(n))
        const index = sortedKeys.indexOf(data.key);
        if (index > -1) {
            sortedKeys.splice(index, 1);
            sortedKeys = sortedKeys; // Svelte 반응성 트리거
        }
    }
    
    async function handleTimeAdded(data: { key: string, timestamp: Date }) {
        if (!keyTimeMap.has(data.key)) return;
        
        const oldTime = keyTimeMap.get(data.key);
        if (oldTime && oldTime.getTime() === data.timestamp.getTime()) return; // 시간이 같으면 아무것도 안 함
        
        // O(n log n)의 전체 정렬 대신 O(n)의 '제거 후 삽입' 수행
        
        // 1. 정렬된 배열에서 'key'의 '이전 위치' 찾아 제거 (O(n))
        const oldIndex = sortedKeys.indexOf(data.key);
        if (oldIndex > -1) {
            sortedKeys.splice(oldIndex, 1);
        }
        
        // 2. 맵의 시간 업데이트 (O(1))
        keyTimeMap.set(data.key, data.timestamp);
        
        // 3. 정렬된 배열에 'key'의 '새 위치' 찾아 삽입 (O(log n) + O(n))
        const newIndex = findInsertIndex(data.key, data.timestamp);
        sortedKeys.splice(newIndex, 0, data.key);
        
        sortedKeys = sortedKeys; // Svelte 반응성 트리거
    }
    
    async function handleTimeRemoved(data: { key: string }) {
        // 시간 제거는 'Epoch' 시간(1970년)으로 업데이트하는 것과 동일하게 처리
        await handleTimeAdded({ key: data.key, timestamp: new Date(0) });
    }

    // 타입별 아이콘 컴포넌트
    function getEmptyStateIcon() {
        switch (type) {
            case InlayType.Image:
                return Image;
            case InlayType.Video:
                return Video;
            case InlayType.Audio:
                return Music;
            default:
                return Image;
        }
    }
    
    function getEmptyStateTitle() {
        switch (type) {
            case InlayType.Image:
                return "이미지가 없습니다";
            case InlayType.Video:
                return "비디오가 없습니다";
            case InlayType.Audio:
                return "오디오가 없습니다";
            default:
                return "자산이 없습니다";
        }
    }
    
    function getEmptyStateDescription() {
        switch (type) {
            case InlayType.Image:
                return "RisuAI에서 이미지 인레이를 추가해주세요";
            case InlayType.Video:
                return "RisuAI에서 비디오 인레이를 추가해주세요";
            case InlayType.Audio:
                return "RisuAI에서 오디오 인레이를 추가해주세요";
            default:
                return "RisuAI에서 인레이를 추가해주세요";
        }
    }
    
    onMount(async () => {
        InlayEventSystem.on(InlayEventType.DATA_ADDED, handleDataAdded);
        InlayEventSystem.on(InlayEventType.DATA_REMOVED, handleDataRemoved);
        InlayEventSystem.on(InlayEventType.TIME_ADDED, handleTimeAdded);
        InlayEventSystem.on(InlayEventType.TIME_REMOVED, handleTimeRemoved);
    });
    
    onDestroy(() => {
        InlayEventSystem.off(InlayEventType.DATA_ADDED, handleDataAdded);
        InlayEventSystem.off(InlayEventType.DATA_REMOVED, handleDataRemoved);
        InlayEventSystem.off(InlayEventType.TIME_ADDED, handleTimeAdded);
        InlayEventSystem.off(InlayEventType.TIME_REMOVED, handleTimeRemoved);
    });
</script>

<div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 p-4">
    {#each sortedKeys as key (key)}
        <div class="aspect-square bg-zinc-800 rounded-lg overflow-hidden transition-all
                    hover:ring-4 hover:ring-blue-500 hover:z-10 relative group
                    cursor-pointer">
            
            <AssetViewer
                {key}
                {type}
                width="w-full"
                height="h-full"
                objectFit={type === InlayType.Audio ? "object-contain" : "object-cover"}
                showControls={false}
            />

            {#if type !== InlayType.Image}
                <div class="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 
                            flex items-center justify-center transition-opacity pointer-events-none">
                    <svg class="w-12 h-12 text-white opacity-0 group-hover:opacity-100 transition-opacity" 
                         fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clip-rule="evenodd" />
                    </svg>
                </div>
            {/if}
        </div>
    {:else}
        <div class="col-span-full flex flex-col items-center justify-center h-64 text-zinc-500">
            <svelte:component this={getEmptyStateIcon()} class="w-16 h-16 mb-4" />
            <p class="text-lg font-medium">{getEmptyStateTitle()}</p>
            <p class="text-sm mt-2">{getEmptyStateDescription()}</p>
        </div>
    {/each}
</div>