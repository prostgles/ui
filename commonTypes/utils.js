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
    { key: "Cloud", subLabel: "Saved to Amazon S3" },
];
export function matchObj(obj1, obj2) {
    if (obj1 && obj2) {
        return !Object.keys(obj1).some((k) => obj1[k] !== obj2[k]);
    }
    return false;
}
export function sliceText(text, maxLen, ellipseText = "...", midEllipse = false) {
    if (isDefined(text) && text.length > maxLen) {
        if (!midEllipse)
            return `${text.slice(0, maxLen)}${ellipseText}`;
        return `${text.slice(0, maxLen / 2)}${ellipseText}${text.slice(text.length - maxLen / 2 + 3)}`;
    }
    return text;
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
export const getEntries = (obj) => Object.entries(obj);
export const CONNECTION_CONFIG_SECTIONS = [
    "access_control",
    "backups",
    "table_config",
    "details",
    "status",
    "methods",
    "file_storage",
    "API",
];
/**
 * Ensure that multi-line strings are indented correctly
 */
export const fixIndent = (_str) => {
    var _a;
    const str = typeof _str === "string" ? _str : ((_a = _str[0]) !== null && _a !== void 0 ? _a : "");
    const lines = str.split("\n");
    if (!lines.some((l) => l.trim()))
        return str;
    let minIdentOffset = lines.reduce((a, line) => {
        if (!line.trim())
            return a;
        const indent = line.length - line.trimStart().length;
        return Math.min(a !== null && a !== void 0 ? a : indent, indent);
    }, undefined);
    minIdentOffset = Math.max(minIdentOffset !== null && minIdentOffset !== void 0 ? minIdentOffset : 0, 0);
    return lines
        .map((l, i) => (i === 0 ? l : l.slice(minIdentOffset)))
        .join("\n")
        .trim();
};
export const getConnectionPaths = ({ id, url_path, }) => {
    return {
        rest: `${API_ENDPOINTS.REST}/${url_path || id}`,
        ws: `${API_ENDPOINTS.WS_DB}/${url_path || id}`,
        dashboard: `${ROUTES.DASHBOARD}/${id}`,
        config: `${ROUTES.CONFIG}/${id}`,
    };
};
export const API_ENDPOINTS = {
    REST: "/rest-api",
    WS_DB: "/ws-api-db",
    WS_DBS: "/ws-api-dbs",
};
export const ROUTES = {
    MAGIC_LINK: "/magic-link",
    LOGIN: "/login",
    LOGOUT: "/logout",
    ACCOUNT: "/account",
    DASHBOARD: "/connections",
    CONFIG: "/connection-config",
    SERVER_SETTINGS: "/server-settings",
    COMPONENT_LIST: "/component-list",
    EDIT_CONNECTION: "/edit-connection",
    NEW_CONNECTION: "/new-connection",
    USERS: "/users",
    BACKUPS: "/prostgles_backups",
    STORAGE: "/prostgles_storage",
};
const testForDuplicateValues = (obj, name) => {
    if (new Set(Object.values(obj)).size !== Object.keys(obj).length) {
        throw new Error(`${name} must not have duplicate values: ${Object.values(obj)}`);
    }
};
testForDuplicateValues(API_ENDPOINTS, "API_ENDPOINTS");
testForDuplicateValues(ROUTES, "ROUTES");
export const PROSTGLES_CLOUD_URL = "https://cloud1.prostgles.com";
export const FORKED_PROC_ENV_NAME = "IS_FORKED_PROC";
export const getProperty = (o, k) => {
    return o[k];
};
export function debouncePromise(promiseFuncDef) {
    let currentPromise;
    return function (...args) {
        // If there's no active promise, create a new one
        if (!currentPromise) {
            currentPromise = promiseFuncDef(...args).finally(() => {
                currentPromise = undefined;
            });
            return currentPromise;
        }
        // Otherwise, wait for the current promise to finish, then run the new one
        return currentPromise.then(() => promiseFuncDef(...args));
    };
}
export const getCaller = () => {
    //@ts-ignore
    // Error.stackTraceLimit = 30;
    var _a, _b, _c;
    const error = new Error();
    const stackLines = (_b = (_a = error.stack) === null || _a === void 0 ? void 0 : _a.split("\n")) !== null && _b !== void 0 ? _b : [];
    const callerLine = (_c = stackLines[2]) !== null && _c !== void 0 ? _c : "";
    return stackLines;
};
