export const SECOND = 1000;
export const MINUTE = SECOND * 60;
export const HOUR = MINUTE * 60;
export const DAY = HOUR * 24;
export const MONTH = DAY * 30;
export const YEAR = DAY * 365;
export const QUERY_WATCH_IGNORE = "prostgles internal query that should be excluded from schema watch ";
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
        const diffInMs = diff;
        const years = roundFunc(diffInMs / YEAR);
        const months = roundFunc((diffInMs % YEAR) / MONTH);
        const days = roundFunc((diffInMs % MONTH) / DAY);
        const hours = roundFunc((diffInMs % DAY) / HOUR);
        const minutes = roundFunc((diffInMs % HOUR) / MINUTE);
        const seconds = roundFunc((diffInMs % MINUTE) / SECOND);
        const milliseconds = diffInMs % SECOND;
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
export const DESTINATIONS = [
    { key: "Local", subLabel: "Saved locally (server in address bar)" },
    { key: "Cloud", subLabel: "Saved to Amazon S3" }
];
