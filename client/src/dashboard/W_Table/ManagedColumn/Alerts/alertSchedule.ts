export const getAlertSchedule = (cron: string) => {
  const parts = cron.trim().split(/\s+/);
  if (parts.length === 6 && parts[0] === "0") parts.shift();
  const [minute, hour, monthDay, month, weekDay] = parts;
  const isNumberInRange = (
    value: string | undefined,
    min: number,
    max: number,
  ) => !!value && /^\d{1,2}$/.test(value) && +value >= min && +value <= max;
  let frequency: ScheduleFrequency = "custom";
  if (parts.length === 5 && month === "*" && isNumberInRange(minute, 0, 59)) {
    if (hour === "*" && monthDay === "*" && weekDay === "*") {
      frequency = "hourly";
    } else if (isNumberInRange(hour, 0, 23)) {
      if (monthDay === "*") {
        if (weekDay === "*") frequency = "daily";
        else if (weekDay === "1-5") frequency = "weekdays";
        else if (isNumberInRange(weekDay, 0, 7)) frequency = "weekly";
      } else if (weekDay === "*" && isNumberInRange(monthDay, 1, 31)) {
        frequency = "monthly";
      }
    }
  }
  const time =
    frequency === "custom" || frequency === "hourly" ?
      "09:00"
    : `${hour?.padStart(2, "0")}:${minute?.padStart(2, "0")}`;
  return {
    frequency,
    time,
    minute: frequency === "hourly" ? Number(minute) : 0,
    weekDay: frequency === "weekly" ? String(Number(weekDay) % 7) : "1",
    monthDay: frequency === "monthly" ? Number(monthDay) : 1,
  };
};

export const getAlertScheduleSummary = (cron: string) => {
  const { frequency, time, minute, weekDay, monthDay } = getAlertSchedule(cron);
  if (frequency === "hourly") {
    return minute ? `Every hour at ${minute} minutes past` : "Every hour";
  }
  if (frequency === "daily") return `Every day at ${time}`;
  if (frequency === "weekdays") return `Weekdays at ${time}`;
  if (frequency === "weekly") {
    const day = SCHEDULE_WEEKDAYS.find(({ key }) => key === weekDay)?.label;
    return `Every ${day} at ${time}`;
  }
  if (frequency === "monthly") return `Monthly on day ${monthDay} at ${time}`;
  return cron ? `Custom schedule (${cron})` : "Choose a schedule";
};

export const SCHEDULE_FREQUENCIES = [
  { key: "daily", label: "Every day" },
  { key: "weekdays", label: "Weekdays (Monday–Friday)" },
  { key: "weekly", label: "Every week" },
  { key: "monthly", label: "Every month" },
  { key: "hourly", label: "Every hour" },
  { key: "custom", label: "Custom (advanced)" },
] as const;

export const SCHEDULE_WEEKDAYS = [
  { key: "1", label: "Monday" },
  { key: "2", label: "Tuesday" },
  { key: "3", label: "Wednesday" },
  { key: "4", label: "Thursday" },
  { key: "5", label: "Friday" },
  { key: "6", label: "Saturday" },
  { key: "0", label: "Sunday" },
] as const;

export type ScheduleFrequency = (typeof SCHEDULE_FREQUENCIES)[number]["key"];
