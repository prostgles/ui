import Btn from "@components/Btn";
import { FlexRow } from "@components/Flex";
import { Select } from "@components/Select/Select";
import { mdiCheck } from "@mdi/js";
import React, { useState } from "react";
import { t } from "../../../../i18n/i18nUtils";
import { updateWCols } from "../../tableUtils/tableUtils";
import type { ColumnConfigNested } from "../ColumnConfig";
import type { LinkedColumnProps } from "./LinkedColumn";

export const NEW_COL_POSITIONS = [
  { key: "start", label: "Start of table" },
  { key: "end", label: "End of table" },
] as const;

type P = LinkedColumnProps & {
  localColumn: ColumnConfigNested | undefined;
  disabledInfo: string | undefined;
};
export const LinkedColumnFooter = ({
  onClose,
  column,
  w,
  localColumn,
  disabledInfo,
}: P) => {
  const [addTo, setPosition] =
    useState<(typeof NEW_COL_POSITIONS)[number]["key"]>("start");
  return (
    <>
      {column && (
        <FlexRow className="mt-2 ai-end">
          <Select
            label={"Add to"}
            value={addTo}
            fullOptions={NEW_COL_POSITIONS}
            onChange={setPosition}
          />
        </FlexRow>
      )}
      <FlexRow className="mt-2">
        {onClose && (
          <Btn onClick={onClose} variant="outline" size="default">
            {t.common["Cancel"]}
          </Btn>
        )}
        {column && (
          <Btn
            color="danger"
            size="default"
            onClick={() => {
              void updateWCols(
                w,
                w.$get()?.columns?.filter((c) => c.name !== column.name),
              );
              onClose?.();
            }}
          >
            {t.common.Remove}
          </Btn>
        )}

        {localColumn && (
          <Btn
            color="action"
            variant="filled"
            size="default"
            className="ml-auto"
            disabledInfo={disabledInfo}
            data-command="LinkedColumn.Add"
            iconPath={mdiCheck}
            onClickMessage={(e, setM) => {
              setM({ loading: 1 });
              if (!w.columns) throw "not possible";
              const newColumns =
                !column ?
                  addTo === "start" ?
                    [localColumn, ...w.columns]
                  : [...w.columns, localColumn]
                : w.columns.map((c) =>
                    c.name === column.name ? localColumn : c,
                  );
              void updateWCols(w, newColumns);
              setM({ ok: t.LinkedColumn["Added!"] });
              onClose?.();
            }}
          >
            {!column ? t.common.Add : t.common.Update} Linked Column
          </Btn>
        )}
      </FlexRow>
    </>
  );
};
