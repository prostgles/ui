import React, { createRef, useMemo, useRef, useState } from "react";
import SmartCardList from "../SmartCard/SmartCardList";
import type { GetRefHooks, SmartFormProps } from "./SmartForm";
import type { AnyObject } from "prostgles-types";
import { FlexCol } from "../../components/Flex";
import ErrorComponent from "../../components/ErrorComponent";
import Popup from "../../components/Popup/Popup";
import SmartForm from "./SmartForm";

export const SmartFormNestedInserts = ({
  theme,
  db,
  tables,
  methods,
  tableName,
}: Pick<
  SmartFormProps,
  "theme" | "db" | "tables" | "tableName" | "methods"
>) => {
  const [nestedInsertData, setNestedInsertData] = useState<
    Record<string, AnyObject[]> | undefined
  >(undefined);

  const nestedInsertTables = useMemo(() => {
    const dencendants = tables.filter((t) =>
      t.columns.some((c) => c.references?.some((r) => r.ftable === tableName)),
    );
    const descendantInsertTables = dencendants
      .filter((t) => db[t.name]?.insert)
      .map((t) => t.name);
    return tables.filter((t) => descendantInsertTables.includes(t.name));
  }, [tables, tableName, db]);
  const table = tables.find((t) => t.name === tableName);

  const [nestedInsertTable, setNestedInsertTable] = useState<string>();

  const insertFormHooks = useRef<GetRefHooks>();
  let insertForm: React.ReactNode = null;
  if (nestedInsertTable) {
    const editableFcols = tables
      .find((t) => t.name === nestedInsertTable)
      ?.columns.filter(
        (c) => !c.references?.some((r) => r.ftable === tableName),
      );
    insertForm = (
      <Popup
        title={`Insert ${nestedInsertTable} record`}
        positioning="right-panel"
        onClose={() => {
          setNestedInsertTable(undefined);
        }}
        contentStyle={{
          padding: 0,
        }}
        footerButtons={[
          {
            label: "Cancel",
            onClickClose: true,
          },
          {
            label: "Add",
            variant: "filled",
            className: "ml-auto",
            color: "action",
            onClick: () => {
              insertFormHooks.current?.getErrors((newRow) => {
                console.log(newRow);
                const existingTableData =
                  this.state.nestedInsertData?.[nestedInsertTable] ?? [];
                existingTableData.push(newRow);
                this.setState(
                  {
                    nestedInsertData: {
                      ...this.state.nestedInsertData,
                      [nestedInsertTable]: existingTableData,
                    },
                    nestedInsertTable: undefined,
                  },
                  () => {
                    onSetNestedInsertData(this.state.nestedInsertData);
                  },
                );
              });
            },
          },
        ]}
      >
        <SmartForm
          theme={theme}
          getRef={(r) => {
            insertFormHooks.current = r;
          }}
          db={db}
          methods={methods}
          tables={tables}
          label=" "
          tableName={nestedInsertTable}
          onChange={() => {}}
          onSuccess={onSuccess}
          columns={editableFcols?.reduce((a, v) => ({ ...a, [v.name]: 1 }), {})}
        />
      </Popup>
    );
  }

  return (
    <FlexCol>
      {nestedInsertTables.map(({ name: ftableName, info }) => {
        const data = nestedInsertData?.[ftableName] ?? [];
        const reqInfo = table?.info.requiredNestedInserts?.find(
          (rni) => rni.ftable === ftableName,
        );
        const nestedInsertInfo =
          !reqInfo ? null
          : !data.length ? "Required"
          : reqInfo.minRows && data.length < reqInfo.minRows ?
            `Min ${reqInfo.maxRows}`
          : reqInfo.maxRows && data.length > reqInfo.maxRows ?
            `Max ${reqInfo.maxRows}`
          : null;
        return (
          <FlexCol key={ftableName}>
            {nestedInsertInfo && <ErrorComponent error={nestedInsertInfo} />}
            <SmartCardList
              theme={theme}
              db={db as any}
              methods={methods}
              tableName={ftableName}
              tables={tables}
              noDataComponent={<div>No data</div>}
              className="px-1"
              // variant="row"
              // onSuccess={onSuccess}
              data={data}
              onChange={(newData) => {
                setNestedInsertData({
                  ...nestedInsertData,
                  [ftableName]: newData,
                });
              }}
            />
          </FlexCol>
        );
      })}
    </FlexCol>
  );
};
