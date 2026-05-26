import React, { useMemo } from "react";
import { tryCatchV2 } from "prostgles-types";
import { GOOGLE_FAVICON_ENDPOINT } from "@common/mcp/web.mcp.schema";

export const Favicon = ({
  url,
  className,
}: {
  url: string;
  className?: string;
}) => {
  const faviconUrl = useMemo(
    () =>
      tryCatchV2(() => {
        const _url = new URL(url);
        const domain = _url.hostname;
        // const mainUrl = `https://icons.duckduckgo.com/ip3/${domain}.ico`;
        const otherUrl = `${GOOGLE_FAVICON_ENDPOINT}?domain=${domain}&sz=64`;
        return otherUrl;
      }).data,
    [url],
  );

  if (!faviconUrl) return null;

  return (
    <img
      className={className}
      src={faviconUrl}
      alt="Favicon"
      style={{ width: 24, height: 24 }}
    />
  );
};
