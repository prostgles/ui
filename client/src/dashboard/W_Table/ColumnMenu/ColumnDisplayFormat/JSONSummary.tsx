import { getProperty } from "@common/utils";
import Btn from "@components/Btn";
import { MonacoEditor } from "@components/MonacoEditor/MonacoEditor";
import PopupMenu from "@components/PopupMenu";
import React from "react";

export const JSONSummary = ({
  value,
  path,
  title,
}: {
  value: unknown;
  path: string[];
  title: string;
}) => {
  if (value == null) return null;
  const summary = path.reduce<unknown>(
    (item, key) =>
      item && typeof item === "object" ? getProperty(item, key) : undefined,
    value,
  );
  const text =
    (
      path.length &&
      (typeof summary === "string" ||
        typeof summary === "number" ||
        typeof summary === "boolean") &&
      String(summary).length
    ) ?
      String(summary)
    : "View JSON";

  return (
    <PopupMenu
      title={title}
      positioning="center"
      rootStyle={{ width: "min(800px, calc(100vw - 2em))" }}
      onClickClose={false}
      showFullscreenToggle={{}}
      button={
        <Btn
          size="small"
          color="indigo"
          variant="faded"
          className="text-ellipsis max-w-full"
          style={{ borderRadius: "12px" }}
          title={`View ${title} JSON`}
        >
          {text}
        </Btn>
      }
      render={() => (
        <MonacoEditor
          language="json"
          value={JSON.stringify(value, null, 2)}
          loadedSuggestions={undefined}
          options={{
            readOnly: true,
            minimap: { enabled: false },
            automaticLayout: true,
          }}
          style={{ height: "min(60vh, 600px)" }}
        />
      )}
    />
  );
};
