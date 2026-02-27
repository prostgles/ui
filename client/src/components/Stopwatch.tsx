import React, { useEffect, useState } from "react";

export const Stopwatch = ({
  startTime,
  endTime,
  title,
}: {
  startTime: Date;
  endTime: Date | undefined;
  title?: string;
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

  const displayTime = getDurationAsStr(elapsed);
  return (
    <div title={title} className="ws-nowrap">
      {displayTime}
    </div>
  );
};

export const getDurationAsStr = (elapsedMs: number) => {
  const totalSeconds = Math.floor(elapsedMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const displayTime = [
    hours > 0 ? `${hours}h` : null,
    hours > 0 || minutes > 0 ? `${minutes}m` : null,
    `${seconds}s`,
  ]
    .filter(Boolean)
    .join(" ");
  return displayTime;
};
