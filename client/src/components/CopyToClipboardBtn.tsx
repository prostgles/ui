import { mdiContentCopy } from "@mdi/js";
import React from "react";
import { t } from "../i18n/i18nUtils";
import Btn, { type BtnProps } from "./Btn";

export const CopyToClipboardBtn = ({
  content,
  ...btnProps
}: { content: string } & Pick<
  BtnProps,
  "className" | "children" | "style" | "size" | "variant" | "color"
>) => {
  return (
    <Btn
      {...btnProps}
      title={t.common["Copy to clipboard"]}
      iconPath={mdiContentCopy}
      onClickMessage={async (_, setM) => {
        await navigator.clipboard.writeText(content);
        setM({ ok: t.common["Copied!"] });
      }}
    />
  );
};
