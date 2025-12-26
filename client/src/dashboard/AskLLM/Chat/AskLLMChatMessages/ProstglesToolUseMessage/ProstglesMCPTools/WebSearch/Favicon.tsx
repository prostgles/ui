import React, { useMemo } from "react";
import { tryCatchV2 } from "prostgles-types";

export const Favicon = ({ url }: { url: string }) => {
  const faviconUrl = useMemo(
    () =>
      tryCatchV2(() => {
        const _url = new URL(url);
        const domain = _url.hostname;
        // const mainUrl = `https://icons.duckduckgo.com/ip3/${domain}.ico`;
        const otherUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
        return otherUrl;
      }).data,
    [url],
  );

  if (!faviconUrl) return null;

  return (
    <img src={faviconUrl} alt="Favicon" style={{ width: 24, height: 24 }} />
  );
};
