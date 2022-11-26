export const SECOND = 1000;
export const MINUTE = SECOND * 60;
export const HOUR = MINUTE * 60;
export const DAY = HOUR * 24;
export const MONTH = DAY * 30;
export const YEAR = DAY * 365;
export const getAge = (date1, date2, returnAll) => {
    const diff = +date2 - +date1;
    const years = diff / YEAR, months = diff / MONTH, days = diff / DAY, hours = diff / HOUR, minutes = diff / MINUTE, seconds = diff / SECOND;
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
