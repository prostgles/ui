import { isDefined } from "./filterUtils";
export const SECOND = 1000;
export const MINUTE = SECOND * 60;
export const HOUR = MINUTE * 60;
export const DAY = HOUR * 24;
export const MONTH = DAY * 30;
export const YEAR = DAY * 365;
export const QUERY_WATCH_IGNORE = "prostgles internal query that should be excluded from schema watch ";
export const getAgeFromDiff = (millisecondDiff) => {
    const roundFunc = millisecondDiff > 0 ? Math.floor : Math.ceil;
    const years = roundFunc(millisecondDiff / YEAR);
    const months = roundFunc((millisecondDiff % YEAR) / MONTH);
    const days = roundFunc((millisecondDiff % MONTH) / DAY);
    const hours = roundFunc((millisecondDiff % DAY) / HOUR);
    const minutes = roundFunc((millisecondDiff % HOUR) / MINUTE);
    const seconds = roundFunc((millisecondDiff % MINUTE) / SECOND);
    const milliseconds = millisecondDiff % SECOND;
    return { years, months, days, hours, minutes, seconds, milliseconds };
};
export const getAge = (date1, date2, returnAll) => {
    const diff = +date2 - +date1;
    const roundFunc = diff > 0 ? Math.floor : Math.ceil;
    const years = roundFunc(diff / YEAR);
    const months = roundFunc(diff / MONTH);
    const days = roundFunc(diff / DAY);
    const hours = roundFunc(diff / HOUR);
    const minutes = roundFunc(diff / MINUTE);
    const seconds = roundFunc(diff / SECOND);
    if (returnAll && returnAll === true) {
        return getAgeFromDiff(diff);
    }
    if (years >= 1) {
        return { years, months };
    }
    else if (months >= 1) {
        return { months, days };
    }
    else if (days >= 1) {
        return { days, hours };
    }
    else if (hours >= 1) {
        return { hours, minutes };
    }
    else {
        return { minutes, seconds };
    }
};
export const DESTINATIONS = [
    { key: "Local", subLabel: "Saved locally (server in address bar)" },
    { key: "Cloud", subLabel: "Saved to Amazon S3" }
];
export function matchObj(obj1, obj2) {
    if (obj1 && obj2) {
        return !Object.keys(obj1).some(k => obj1[k] !== obj2[k]);
    }
    return false;
}
export function sliceText(v, maxLen, ellipseText = "...", midEllipse = false) {
    if (isDefined(v) && v.length > maxLen) {
        if (!midEllipse)
            return `${v.slice(0, maxLen)}${ellipseText}`;
        return `${v.slice(0, maxLen / 2)}${ellipseText}${v.slice(v.length - (maxLen / 2) + 3)}`;
    }
    return v;
}
export const RELOAD_NOTIFICATION = "Prostgles UI accessible at";
export function throttle(func, timeout) {
    //@ts-ignore
    let timer;
    let lastCallArgs;
    const throttledFunc = (...args) => {
        if (timer !== undefined) {
            lastCallArgs = args;
            return;
        }
        else {
            lastCallArgs = undefined;
        }
        //@ts-ignore
        timer = setTimeout(() => {
            func(...args);
            timer = undefined;
            if (lastCallArgs) {
                throttledFunc(...lastCallArgs);
            }
        }, timeout);
    };
    return throttledFunc;
}
export const SPOOF_TEST_VALUE = "trustme";
