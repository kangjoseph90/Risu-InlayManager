<script lang="ts">
    import { onMount, onDestroy, tick } from 'svelte';

    export let items: any[] = [];
    export let itemHeight: number = 200; // Height of each grid item
    export let gap: number = 12; // Gap between items
    export let columns: number = 6; // Default columns
    export let visibleIndices: Set<number> = new Set(); // Export visible indices for parent component

    let containerElement: HTMLDivElement;
    let scrollContainer: HTMLElement | null = null;
    let visibleStartIndex = 0;
    let visibleEndIndex = 20;
    let containerHeight = 0;
    let scrollTop = 0;

    // Calculate responsive columns based on container width
    let containerWidth = 0;
    $: if (containerWidth > 0) {
        if (containerWidth >= 1280) columns = 6;      // xl
        else if (containerWidth >= 1024) columns = 5; // lg
        else if (containerWidth >= 768) columns = 4;  // md
        else if (containerWidth >= 640) columns = 3;  // sm
        else columns = 2;                             // default
    }

    // Calculate grid dimensions
    $: rowHeight = itemHeight + gap;
    $: totalRows = Math.ceil(items.length / columns);
    $: totalHeight = totalRows * rowHeight;
    $: itemsPerRow = columns;

    // Calculate visible range with buffer
    $: {
        const bufferRows = 2; // Extra rows above and below viewport
        const viewportHeight = containerHeight || 800;
        const startRow = Math.max(0, Math.floor(scrollTop / rowHeight) - bufferRows);
        const endRow = Math.min(totalRows, Math.ceil((scrollTop + viewportHeight) / rowHeight) + bufferRows);
        
        visibleStartIndex = startRow * itemsPerRow;
        visibleEndIndex = Math.min(items.length, endRow * itemsPerRow);
        
        // Update visible indices
        visibleIndices.clear();
        for (let i = visibleStartIndex; i < visibleEndIndex; i++) {
            visibleIndices.add(i);
        }
        visibleIndices = visibleIndices; // Trigger reactivity
    }

    $: visibleItems = items.slice(visibleStartIndex, visibleEndIndex);
    $: offsetY = Math.floor(visibleStartIndex / itemsPerRow) * rowHeight;

    function handleScroll(e: Event) {
        const target = e.target as HTMLElement;
        scrollTop = target.scrollTop;
    }

    function updateDimensions() {
        if (scrollContainer) {
            containerHeight = scrollContainer.clientHeight;
            containerWidth = scrollContainer.clientWidth;
        }
    }

    let resizeObserver: ResizeObserver;

    onMount(async () => {
        await tick();
        
        // Find scroll container (parent with overflow)
        let parent = containerElement.parentElement;
        while (parent) {
            const overflow = window.getComputedStyle(parent).overflow;
            if (overflow === 'auto' || overflow === 'scroll' || overflow === 'hidden') {
                scrollContainer = parent;
                break;
            }
            parent = parent.parentElement;
        }

        if (!scrollContainer) {
            scrollContainer = containerElement.parentElement;
        }

        if (scrollContainer) {
            scrollContainer.addEventListener('scroll', handleScroll);
            updateDimensions();

            resizeObserver = new ResizeObserver(() => {
                updateDimensions();
            });
            resizeObserver.observe(scrollContainer);
        }
    });

    onDestroy(() => {
        if (scrollContainer) {
            scrollContainer.removeEventListener('scroll', handleScroll);
        }
        if (resizeObserver) {
            resizeObserver.disconnect();
        }
    });
</script>

<div bind:this={containerElement} class="relative w-full" style="height: {totalHeight}px;">
    <div 
        class="grid gap-3 p-4 absolute w-full"
        style="
            grid-template-columns: repeat({columns}, minmax(0, 1fr));
            transform: translateY({offsetY}px);
        "
    >
        {#each visibleItems as item, index (items[visibleStartIndex + index])}
            <slot item={item} index={visibleStartIndex + index} />
        {/each}
    </div>
</div>
