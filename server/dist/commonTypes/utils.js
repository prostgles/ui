"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RELOAD_NOTIFICATION = exports.sliceText = exports.matchObj = exports.DESTINATIONS = exports.getAge = exports.getAgeFromDiff = exports.QUERY_WATCH_IGNORE = exports.YEAR = exports.MONTH = exports.DAY = exports.HOUR = exports.MINUTE = exports.SECOND = void 0;
const filterUtils_1 = require("./filterUtils");
exports.SECOND = 1000;
exports.MINUTE = exports.SECOND * 60;
exports.HOUR = exports.MINUTE * 60;
exports.DAY = exports.HOUR * 24;
exports.MONTH = exports.DAY * 30;
exports.YEAR = exports.DAY * 365;
exports.QUERY_WATCH_IGNORE = "prostgles internal query that should be excluded from schema watch ";
const getAgeFromDiff = (millisecondDiff) => {
    const roundFunc = millisecondDiff > 0 ? Math.floor : Math.ceil;
    const years = roundFunc(millisecondDiff / exports.YEAR);
    const months = roundFunc((millisecondDiff % exports.YEAR) / exports.MONTH);
    const days = roundFunc((millisecondDiff % exports.MONTH) / exports.DAY);
    const hours = roundFunc((millisecondDiff % exports.DAY) / exports.HOUR);
    const minutes = roundFunc((millisecondDiff % exports.HOUR) / exports.MINUTE);
    const seconds = roundFunc((millisecondDiff % exports.MINUTE) / exports.SECOND);
    const milliseconds = millisecondDiff % exports.SECOND;
    return { years, months, days, hours, minutes, seconds, milliseconds };
};
exports.getAgeFromDiff = getAgeFromDiff;
const getAge = (date1, date2, returnAll) => {
    const diff = +date2 - +date1;
    const roundFunc = diff > 0 ? Math.floor : Math.ceil;
    const years = roundFunc(diff / exports.YEAR);
    const months = roundFunc(diff / exports.MONTH);
    const days = roundFunc(diff / exports.DAY);
    const hours = roundFunc(diff / exports.HOUR);
    const minutes = roundFunc(diff / exports.MINUTE);
    const seconds = roundFunc(diff / exports.SECOND);
    if (returnAll && returnAll === true) {
        return (0, exports.getAgeFromDiff)(diff);
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
exports.getAge = getAge;
exports.DESTINATIONS = [
    { key: "Local", subLabel: "Saved locally (server in address bar)" },
    { key: "Cloud", subLabel: "Saved to Amazon S3" }
];
function matchObj(obj1, obj2) {
    if (obj1 && obj2) {
        return !Object.keys(obj1).some(k => obj1[k] !== obj2[k]);
    }
    return false;
}
exports.matchObj = matchObj;
function sliceText(v, maxLen, ellipseText = "...", midEllipse = false) {
    if ((0, filterUtils_1.isDefined)(v) && v.length > maxLen) {
        if (!midEllipse)
            return `${v.slice(0, maxLen)}${ellipseText}`;
        return `${v.slice(0, maxLen / 2)}${ellipseText}${v.slice(v.length - (maxLen / 2) + 3)}`;
    }
    return v;
}
exports.sliceText = sliceText;
exports.RELOAD_NOTIFICATION = "Prostgles UI accessible at";
//# sourceMappingURL=utils.js.map