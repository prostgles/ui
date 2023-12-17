"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DESTINATIONS = exports.getAge = exports.QUERY_WATCH_IGNORE = exports.YEAR = exports.MONTH = exports.DAY = exports.HOUR = exports.MINUTE = exports.SECOND = void 0;
exports.SECOND = 1000;
exports.MINUTE = exports.SECOND * 60;
exports.HOUR = exports.MINUTE * 60;
exports.DAY = exports.HOUR * 24;
exports.MONTH = exports.DAY * 30;
exports.YEAR = exports.DAY * 365;
exports.QUERY_WATCH_IGNORE = "prostgles internal query that should be excluded from schema watch ";
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
        const diffInMs = diff;
        const years = roundFunc(diffInMs / exports.YEAR);
        const months = roundFunc((diffInMs % exports.YEAR) / exports.MONTH);
        const days = roundFunc((diffInMs % exports.MONTH) / exports.DAY);
        const hours = roundFunc((diffInMs % exports.DAY) / exports.HOUR);
        const minutes = roundFunc((diffInMs % exports.HOUR) / exports.MINUTE);
        const seconds = roundFunc((diffInMs % exports.MINUTE) / exports.SECOND);
        const milliseconds = diffInMs % exports.SECOND;
        return { years, months, days, hours, minutes, seconds, milliseconds };
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
//# sourceMappingURL=utils.js.map