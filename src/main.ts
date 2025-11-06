//@ts-ignore
import './style.css';
import { RisuAPI } from './api';
import { UI } from './ui';
import { TimeTracker } from './tracker/time';
import { TypeTracker } from './tracker/type';

const typeTracker = new TypeTracker();
const timeTracker = new TimeTracker();
const ui = new UI();

// 초기 sync 실행 (on entry)
TypeTracker.sync();

RisuAPI.onUnload(() => {
    timeTracker.destroy();
    typeTracker.destroy();
    ui.destroy();
})