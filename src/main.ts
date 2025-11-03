//@ts-ignore
import './style.css';
import { RisuAPI } from './api';
import { UI } from './ui';
import { TimeTracker } from './tracker/time';

const timeTracker = new TimeTracker();
const ui = new UI();

RisuAPI.onUnload(() => {
    timeTracker.destroy();
    ui.destroy();
})