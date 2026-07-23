import Btn from "@components/Btn";
import { useCountdown } from "@components/Stopwatch";
import React, { useEffect } from "react";

type P = {
  authorizationUrl: string;
};

const usedAuthUrl = new Set<string>();

export const McpServerOAuthConfigAuthorizeUrlBtn = ({
  authorizationUrl,
}: P) => {
  const countdown = useCountdown();

  useEffect(() => {
    if (!authorizationUrl || usedAuthUrl.has(authorizationUrl)) {
      return;
    }

    /** If window is not focused it won't open */
    const isFocused = document.hasFocus();
    if (!isFocused) {
      return;
    }

    usedAuthUrl.add(authorizationUrl);
    countdown.start({
      endTime: new Date(Date.now() + 5_000),
      onFinish: () => {
        window.open(authorizationUrl, "_blank");
      },
    });
  }, [authorizationUrl, countdown]);

  return (
    <Btn
      href={authorizationUrl}
      target="_blank"
      rel="noopener noreferrer"
      data-command="McpServerOAuthConfigAuthorizeUrlBtn.OpenAuthorizationUrl"
      variant="filled"
      color="action"
      onClick={countdown.stop}
      onContextMenu={countdown.stop}
      children={
        countdown.elapsed ?
          `Open Authorization URL (will open in ${countdown.elapsed})`
        : "Open Authorization URL"
      }
    />
  );
};
