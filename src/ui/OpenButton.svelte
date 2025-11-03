<script lang="ts">
    import Modal from './Modal.svelte';
    import { Images } from 'lucide-svelte'

    export let id: string;

    function onClick(): void {
        const container = document.createElement('div');
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

<button class="im-flex im-gap-2 im-items-center hover:text-textcolor text-textcolor2" id={id} on:click={onClick}>
    <Images  />
    <span>갤러리</span>
</button>
