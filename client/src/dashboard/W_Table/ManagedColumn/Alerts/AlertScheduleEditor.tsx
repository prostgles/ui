import FormField from "@components/FormField/FormField";
import { isObject } from "prostgles-types";
import React, { useState } from "react";
import {
  getAlertSchedule,
  getAlertScheduleSummary,
  SCHEDULE_FREQUENCIES,
  SCHEDULE_WEEKDAYS,
  type ScheduleFrequency,
} from "./alertSchedule";

export const AlertScheduleEditor = ({
  value,
  onChange,
}: {
  value: unknown;
  onChange: (value: unknown) => void;
}) => {
  const schedule = isObject(value) ? value : {};
  const cron = typeof schedule.cron === "string" ? schedule.cron : "";
  const timezone =
    typeof schedule.timezone === "string" ? schedule.timezone : "UTC";
  const parsed = getAlertSchedule(cron);
  const [showCustom, setShowCustom] = useState(
    !!cron && parsed.frequency === "custom",
  );
  const frequency = showCustom ? "custom" : parsed.frequency;
  const setCron = (cron: string) => onChange({ ...schedule, cron, timezone });
  const setPreset = (
    frequency: ScheduleFrequency,
    changes: Partial<
      Pick<typeof parsed, "time" | "minute" | "weekDay" | "monthDay">
    > = {},
  ) => {
    const { time, minute, weekDay, monthDay } = { ...parsed, ...changes };
    const [hours, minutes] = time.split(":");
    if (!hours || !minutes) return;
    const expression =
      frequency === "hourly" ? `${minute} * * * *`
      : frequency === "daily" ? `${+minutes} ${+hours} * * *`
      : frequency === "weekdays" ? `${+minutes} ${+hours} * * 1-5`
      : frequency === "weekly" ? `${+minutes} ${+hours} * * ${weekDay}`
      : frequency === "monthly" ? `${+minutes} ${+hours} ${monthDay} * *`
      : cron || "0 9 * * *";
    setCron(expression);
  };
  return (
    <>
      <FormField
        label="Repeat"
        value={cron || showCustom ? frequency : ""}
        fullOptions={SCHEDULE_FREQUENCIES}
        onChange={(frequency: ScheduleFrequency) => {
          setShowCustom(frequency === "custom");
          setPreset(frequency);
        }}
      />
      {(cron || showCustom) &&
        (frequency === "custom" ?
          <FormField
            label="Cron expression"
            value={cron}
            placeholder="0 9 * * *"
            hint="Minute, hour, day of month, month, day of week; optional seconds first."
            onChange={setCron}
          />
        : <>
            {frequency === "weekly" && (
              <FormField
                label="Day of week"
                value={parsed.weekDay}
                fullOptions={SCHEDULE_WEEKDAYS}
                onChange={(weekDay) => setPreset(frequency, { weekDay })}
              />
            )}
            {frequency === "monthly" && (
              <FormField
                label="Day of month"
                value={String(parsed.monthDay)}
                fullOptions={Array.from({ length: 31 }, (_, index) => ({
                  key: String(index + 1),
                }))}
                hint={
                  parsed.monthDay > 28 ?
                    "Months without this day are skipped."
                  : undefined
                }
                onChange={(monthDay) =>
                  setPreset(frequency, { monthDay: Number(monthDay) })
                }
              />
            )}
            {frequency === "hourly" ?
              <FormField
                label="Minutes past the hour"
                value={String(parsed.minute)}
                fullOptions={Array.from({ length: 60 }, (_, index) => ({
                  key: String(index),
                }))}
                onChange={(minute) =>
                  setPreset(frequency, { minute: Number(minute) })
                }
              />
            : <FormField
                label="Time of day"
                type="time"
                value={parsed.time}
                onChange={(time) => setPreset(frequency, { time })}
              />
            }
          </>)}
      <FormField
        label="Timezone"
        value={timezone}
        placeholder="Europe/London"
        hint="The schedule follows local time in this timezone."
        onChange={(timezone) =>
          onChange({ ...schedule, cron: cron || "0 9 * * *", timezone })
        }
      />
      {cron && (
        <div className="text-1">
          {getAlertScheduleSummary(cron)} · {timezone}
        </div>
      )}
    </>
  );
};
