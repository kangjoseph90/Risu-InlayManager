import { PLUGIN_NAME, PLUGIN_TITLE } from '../plugin';
import OpenButton from './OpenButton.svelte';

export class UI {
    private readonly OPEN_BUTTON_ID = `${PLUGIN_TITLE}-OpenButton`;
    private timeout: NodeJS.Timeout | null = null;

    constructor() {
        this.initialize();
    }

    initialize() {
        this.dispose();
        const checkAndAdd = () => {
            const buttonContainer = document.querySelector(
                "div.rs-setting-cont-3"
            );
            if (!buttonContainer) {
                this.timeout = window.setTimeout(checkAndAdd, 1000) as any;
                return;
            }

            const openButton = document.getElementById(this.OPEN_BUTTON_ID);
            if (!openButton) {
                this.addOpenButton(buttonContainer);
            }

            this.timeout = window.setTimeout(checkAndAdd, 1000) as any;
        };

        this.timeout = window.setTimeout(checkAndAdd, 1000) as any;
    }

    dispose() {
        if (this.timeout) {
            window.clearTimeout(this.timeout);
            this.timeout = null;
        }
    }

    addOpenButton(buttonContainer: Element) {
        new OpenButton({
            target: buttonContainer,
            props: {
                id: this.OPEN_BUTTON_ID,
            }
        })
    }

    removeOpenButton() {
        const openButton = document.getElementById(this.OPEN_BUTTON_ID);
        if (openButton) {
            openButton.remove();
        }
    }

    destroy() {
        this.dispose();
        this.removeOpenButton();
    }
}
