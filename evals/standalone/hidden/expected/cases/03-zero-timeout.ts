declare const calculateDelay: () => number;
declare const notify: (value: string) => void;

queueMicrotask(() => notify('ready'));
queueMicrotask(notify.bind(null, 'bound'));
setTimeout(() => notify('later'), calculateDelay());
window.setTimeout(() => notify('member'), 0);
