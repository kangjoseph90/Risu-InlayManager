<script lang="ts">
    import Modal from './Modal.svelte';
    import { Images } from 'lucide-svelte'

    export let id: string;

    function onClick(): void {
        const container = document.createElement('div');
        container.id = 'inlay-manager-container';
        document.body.appendChild(container);
        
        let popup: any;
        popup = new Modal({
            target: container,
            props: {
                onClose: () => {
                    popup.$destroy();
                    document.body.removeChild(container);
                }
            }
        });
    }   
</script>

<button class="flex gap-2 items-center hover:text-textcolor text-textcolor2" id={id} on:click={onClick}>
    <Images  />
    <span>갤러리</span>
</button>
