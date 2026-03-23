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

  const displayTime = getDurationAsStr(elapsed, endTime === undefined);
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

export const getDurationAsStr = (elapsedMs: number, excludeMs = false) => {
  const totalSeconds = Math.floor(elapsedMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const milliseconds = elapsedMs % 1000;

  const displayTime = [
    hours > 0 ? `${hours}h` : null,
    hours > 0 || minutes > 0 ? `${minutes}m` : null,
    `${seconds}s`,
    hours || minutes || excludeMs ? "" : `${milliseconds}ms`,
  ]
    .filter(Boolean)
    .join(" ");
  return displayTime;
};
