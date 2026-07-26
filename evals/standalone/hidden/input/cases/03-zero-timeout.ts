declare const calculateDelay: () => number;
declare const notify: (value: string) => void;

setTimeout(() => notify('ready'), 0);
setTimeout(notify.bind(null, 'bound'), 0);
setTimeout(() => notify('later'), calculateDelay());
window.setTimeout(() => notify('member'), 0);
