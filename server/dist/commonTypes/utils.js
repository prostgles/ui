"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DESTINATIONS = exports.getAge = exports.YEAR = exports.MONTH = exports.DAY = exports.HOUR = exports.MINUTE = exports.SECOND = void 0;
exports.SECOND = 1000;
exports.MINUTE = exports.SECOND * 60;
exports.HOUR = exports.MINUTE * 60;
exports.DAY = exports.HOUR * 24;
exports.MONTH = exports.DAY * 30;
exports.YEAR = exports.DAY * 365;
const getAge = (date1, date2, returnAll) => {
    const diff = +date2 - +date1;
    const years = diff / exports.YEAR, months = diff / exports.MONTH, days = diff / exports.DAY, hours = diff / exports.HOUR, minutes = diff / exports.MINUTE, seconds = diff / exports.SECOND;
    if (returnAll && returnAll === true) {
        return { years, months, days, hours, minutes, seconds };
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