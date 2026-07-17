import React, { useEffect, useState } from "react";
import { classOverride } from "./Flex";

export const Stopwatch = ({
  startTime,
  endTime,
  title,
  className,
  style,
}: {
  startTime: Date;
  endTime: Date | undefined;
  title?: string;
  className?: string;
  style?: React.CSSProperties;
}) => {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const updateElapsed = () => {
      setElapsed((endTime?.getTime() ?? Date.now()) - startTime.getTime());
    };

    updateElapsed();
    if (endTime) {
      return;
    }
    const interval = setInterval(updateElapsed, 1000);
    return () => clearInterval(interval);
  }, [endTime, startTime]);

  const displayTime = getDurationAsStr(elapsed, {
    excludeMs: endTime === undefined,
  });
  return (
    <div
      title={title}
      className={classOverride("Stopwatch ws-nowrap", className)}
      style={style}
    >
      {displayTime}
    </div>
  );
};

export const useCountdown = () => {
  const [state, start] = useState<
    { endTime: Date; onFinish: () => void } | undefined
  >(undefined);

  const [elapsed, setElapsed] = useState("");

  useEffect(() => {
    if (!state) {
      return;
    }

    const onElapsedUpdate = () => {
      setElapsed(
        getDurationAsStr(state.endTime.getTime() - Date.now(), {
          excludeMs: true,
        }),
      );
    };
    const interval = setInterval(() => {
      if (Date.now() >= state.endTime.getTime()) {
        state.onFinish();
        clearInterval(interval);
        start(undefined);
        setElapsed("");
      } else {
        onElapsedUpdate();
      }
    }, 1_000);
    return () => clearInterval(interval);
  }, [state]);

  return {
    start,
    elapsed: state?.endTime ? elapsed : "",
  };
};

type DurationOpts = {
  excludeMs?: boolean;
  keepTop?: number;
};
export const getDurationAsStr = (
  elapsedMs: number,
  { excludeMs = false, keepTop }: DurationOpts = {},
) => {
  const totalSeconds = Math.floor(elapsedMs / 1000);
  const years = Math.floor(totalSeconds / 31536000);
  const months = Math.floor(totalSeconds / 2592000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const milliseconds = elapsedMs % 1000;

  const displayTime = [
    years > 0 ? `${years}y` : null,
    months > 0 ? `${months}mo` : null,
    days > 0 ? `${days}d` : null,
    hours > 0 ? `${hours}h` : null,
    hours > 0 || minutes > 0 ? `${minutes}m` : null,
    `${seconds}s`,
    hours || minutes || excludeMs ? "" : `${milliseconds}ms`,
  ]
    .filter(Boolean)
    .slice(0, keepTop)
    .join(" ");
  return displayTime;
};
