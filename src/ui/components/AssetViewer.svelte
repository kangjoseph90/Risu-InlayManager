<script lang="ts">
    import { InlayType } from "../../types";
    import Loading from "./Loading.svelte";
    import { UrlManager } from "../../manager/url";
    
    export let key: string;
    export let type: InlayType;
    export let width: string = "w-full";
    export let height: string = "h-full";
    export let objectFit: string = "object-cover";
    export let showControls: boolean = true;
    
    // Create a reactive promise that resolves to the dataURL
    $: urlPromise = UrlManager.getDataURL(key);

</script>

<div class="{width} {height} flex items-center justify-center">
    {#await urlPromise}
        <Loading size="medium" />
    {:then dataURL}
        {#if type === InlayType.Image}
            <!-- svelte-ignore a11y-img-redundant-alt -->
            <img
                src={dataURL}
                alt="Asset"
                class="{width} {height} {objectFit}"
            />
        {:else if type === InlayType.Video}
            <video
                src={dataURL}
                class="{width} {height} {objectFit}"
                controls={showControls}
            >
                <track kind="captions" />
                해당 브라우저는 비디오를 지원하지 않습니다.
            </video>
        {:else if type === InlayType.Audio}
            <audio
                src={dataURL}
                class="{width} {height}"
                controls={showControls}
            >
                해당 브라우저는 오디오를 지원하지 않습니다.
            </audio>
        {:else}
            <div class="w-full h-full flex items-center justify-center text-red-500">
                Unsupported type
            </div>
        {/if}
    {:catch error}
        <div class="w-full h-full flex items-center justify-center text-red-500">
            <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
        </div>
    {/await}
</div>