<script lang="ts">
    import { InlayType } from "../../types";
    import Loading from "./Loading.svelte";
    import { DataManager } from "../../manager/data";
    import { Image, Video, Music, CircleAlert, AudioLines } from "lucide-svelte";
    
    export let key: string;
    export let width: string = "w-full";
    export let height: string = "h-full";
    export let objectFit: string = "object-cover";
    export let showControls: boolean = true;
    export let isVisible: boolean = true; // For lazy loading

    let dataURL: string = '';
    let type: InlayType = InlayType.Image;
    let loading = true;
    let error: string | null = null;
    let videoElement: HTMLVideoElement;
    let audioElement: HTMLAudioElement;

    
    async function loadAsset() {
        if (!isVisible || !key) {
            return;
        }
        
        try {
            loading = true;
            error = null;
            const data = await DataManager.getData(key);
            if (!data) {
                throw new Error('데이터를 찾을 수 없습니다.');
            }
            dataURL = data.url;
            type = data.type;
        } catch (err) {
            error = err instanceof Error ? err.message : '로드 실패';
            console.error(`Failed to load asset ${key}:`, err);
        } finally {
            loading = false;
        }
    }
    
    $: if (isVisible && key) {
        loadAsset();
    }
</script>

<div class="{width} {height} relative flex items-center justify-center bg-zinc-900">
    {#if isVisible}
        {#if loading}
            <div class="absolute inset-0 flex items-center justify-center">
                <Loading size="medium" />
            </div>
        {:else if error}
            <div class="absolute inset-0 flex flex-col items-center justify-center text-red-400 gap-2">
                <CircleAlert size={24} />
                <span class="text-sm">{error}</span>
            </div>
        {:else if dataURL}
            {#if type === InlayType.Image}
                <img
                    src={dataURL}
                    alt="Asset"
                    class="absolute inset-0 {width} {height} {objectFit} bg-zinc-800"
                    draggable="false"
                />
            {:else if type === InlayType.Video}
                <video
                    bind:this={videoElement}
                    src={dataURL}
                    class="absolute inset-0 {width} {height} {objectFit} bg-zinc-800"
                    controls={showControls}
                    autoplay={false}
                    muted={true}
                    preload="metadata"
                    playsinline
                >
                    <track kind="captions" />
                    해당 브라우저는 비디오를 지원하지 않습니다.
                </video>
            {:else if type === InlayType.Audio}
                <div class="absolute inset-0 flex flex-col items-center justify-center p-4 bg-zinc-800">
                    <!-- Audio Visualizer Icon -->
                    <AudioLines size={48} class="text-blue-500" />

                    <!-- Audio Element -->
                    <audio
                        bind:this={audioElement}
                        src={dataURL}
                        class="w-full max-w-md"
                        controls={showControls}
                        autoplay={false}
                        muted={true}
                        preload="metadata"
                    >
                        해당 브라우저는 오디오를 지원하지 않습니다.
                    </audio>
                </div>
            {:else}
                <div class="absolute inset-0 flex flex-col items-center justify-center text-red-500 gap-2">
                    <svg class="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.cap 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                    <span class="text-sm">지원하지 않는 형식</span>
                </div>
            {/if}
        {:else}
            <div class="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-zinc-800 to-zinc-900 text-zinc-400">
                <span class="text-sm">로드 대기 중...</span>
            </div>
        {/if}

        <!-- Type Badge -->
        <div class="absolute bottom-2 left-2 px-2 py-1 rounded-md bg-black/50 backdrop-blur-sm
                    opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            {#if type === InlayType.Image}
                <Image class="w-4 h-4 text-white" />
            {:else if type === InlayType.Video}
                <Video class="w-4 h-4 text-white" />
            {:else if type === InlayType.Audio}
                <Music class="w-4 h-4 text-white" />
            {/if}
        </div>
    {:else}
        <!-- Placeholder to maintain layout when not visible -->
        <div class="absolute inset-0 bg-zinc-900"></div>
    {/if}
</div>