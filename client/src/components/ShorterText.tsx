import React, { useState } from "react";
import { getColumnDataColor } from "../dashboard/SmartForm/SmartFormField/SmartFormField";
import type { ValidatedColumnInfo } from "prostgles-types";
import { useIsMounted } from "../dashboard/Backup/CredentialSelector";

type P = {
  column?: Pick<
    Partial<ValidatedColumnInfo>,
    "is_pkey" | "tsDataType" | "udt_name"
  >;
  value: string | null;
  style?: React.CSSProperties;
};
export const ShorterText = ({ value: guid, column, style }: P) => {
  const [copied, setCopied] = useState(false);
  const getIsMounted = useIsMounted();
  return (
    <div className="ShorterText flex-row gap-1 ai-center">
      {guid === null ?
        <i>NULL</i>
      : <>
          <div
            className="f-1 pointer relative"
            style={{
              color: getColumnDataColor(
                column ?? { tsDataType: "string", udt_name: "uuid" },
              ),
              ...(style ?? {}),
            }}
            title="Click to copy value"
            onClick={() => {
              navigator.clipboard.writeText(guid);
              setCopied(true);
              setTimeout(() => {
                if (!getIsMounted()) return;
                setCopied(false);
              }, 2000);
            }}
          >
            {copied && (
              <div
                className="absolute bg-color-0 w-full h-full"
                style={{ zIndex: 1 }}
              >
                Copied!
              </div>
            )}
            {guid.substring(0, 8)}
            ...
            {guid.substring(guid.length - 8)}
          </div>
        </>
      }
    </div>
  );
};
