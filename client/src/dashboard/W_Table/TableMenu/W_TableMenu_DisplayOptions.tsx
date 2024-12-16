import React from "react";
import type { W_TableMenuProps } from "./W_TableMenu";
import FormField from "../../../components/FormField/FormField";
import { ColumnSelect } from "../ColumnMenu/ColumnSelect";
import Select from "../../../components/Select/Select";
import { includes } from "../../W_SQL/W_SQLBottomBar/W_SQLBottomBar";
import { IconPalette } from "../../../components/IconPalette/IconPalette";

type P = W_TableMenuProps;

export const W_TableMenu_DisplayOptions = ({
  w,
  workspace,
  prgl: { tables, connection, dbs },
}: P) => {
  const tableName = w.table_name;
  if (!tableName) return null;
  const table = tables.find((t) => t.name === tableName);

  const cardOptions =
    w.options.viewAs?.type === "card" ? w.options.viewAs : undefined;

  return (
    <div className="flex-col gap-1 ai-start mb-1 f-1 o-auto p-p25 ">
      <IconPalette
        label={{
          label: "Icon",
          variant: "normal",
          style: {
            marginBottom: "4px",
          },
        }}
        iconName={connection.table_options?.[w.table_name]?.icon}
        onChange={(icon) => {
          dbs.connections.update(
            { id: connection.id },
            {
              table_options: {
                ...(connection.table_options ?? {}),
                [w.table_name]: {
                  ...connection.table_options?.[w.table_name],
                  icon: icon ?? undefined,
                },
              },
            },
          );
        }}
      />
      <FormField
        className="w-fit f-0"
        type="checkbox"
        label={{
          label: "Hide top count",
          info: "If false will show the number of rows in the table header. Disable to improve performance",
        }}
        value={w.options.hideCount ?? workspace.options.hideCounts ?? false}
        onChange={(hideCount) => {
          w.$update({ options: { hideCount } }, { deepMerge: true });
        }}
      />

      <FormField
        className=" w-fit f-0"
        label="Display mode"
        data-command="table.options.displayMode"
        value={w.options.viewAs?.type ?? "table"}
        fullOptions={(["table", "card", "json"] as const).map((key) => ({
          key,
        }))}
        onChange={(viewAsType) => {
          w.$update(
            {
              options: {
                viewAs:
                  viewAsType === "card" ?
                    {
                      type: "card",
                      maxCardWidth: window.isLowWidthScreen ? "100%" : "700px",
                      hideEmptyCardCells: true,
                    }
                  : { type: viewAsType },
              },
            },
            { deepMerge: true },
          );
        }}
      />

      {w.options.viewAs?.type !== "json" && (
        <FormField
          className="w-fit f-0"
          type="checkbox"
          label={{ label: "Hide show row panel button", info: "First column" }}
          value={!!w.options.hideEditRow}
          onChange={(hideEditRow) => {
            w.$update({ options: { hideEditRow } }, { deepMerge: true });
          }}
        />
      )}
      {cardOptions && table && (
        <>
          <FormField
            className="w-fit f-0"
            type="number"
            label="Cards per row"
            inputProps={{
              step: 1,
              min: 1,
              max: 8,
            }}
            value={cardOptions.cardRows || 1}
            onChange={(e) => {
              w.$update(
                { options: { viewAs: { cardRows: Math.round(+e) } } },
                { deepMerge: true },
              );
            }}
          />
          <ColumnSelect
            label="Cards group by column"
            data-command="table.options.cardView.groupBy"
            columns={table.columns}
            value={cardOptions.cardGroupBy}
            onChange={(c) => {
              w.$update(
                { options: { viewAs: { cardGroupBy: c } } },
                { deepMerge: true },
              );
            }}
          />
          <ColumnSelect
            label="Cards order by column"
            data-command="table.options.cardView.orderBy"
            columns={table.columns.map((c) =>
              includes(c.udt_name, ["numeric", "float4", "float8"]) ? c : (
                {
                  ...c,
                  disabledInfo:
                    "Only columns of data type numeric or float allowed",
                }
              ),
            )}
            value={cardOptions.cardOrderBy}
            onChange={(c) => {
              w.$update(
                { options: { viewAs: { cardOrderBy: c } } },
                { deepMerge: true },
              );
            }}
          />
          <FormField
            className="w-fit f-0"
            type="checkbox"
            label="Hide card column names"
            value={!!cardOptions.hideCardFieldNames}
            onChange={(hideCardFieldNames) => {
              w.$update(
                { options: { viewAs: { hideCardFieldNames } } },
                { deepMerge: true },
              );
            }}
          />
          <Select
            label="Max card cell height in pixels"
            className="w-fit f-0"
            value={cardOptions.maxCardRowHeight ?? 800}
            variant="div"
            options={[25, 50, 100, 150, 200, 300, 400, 500, 600, 700, 800]}
            onChange={(maxCardRowHeight) => {
              w.$update(
                { options: { viewAs: { maxCardRowHeight } } },
                { deepMerge: true },
              );
            }}
          />
          <Select
            label="Card width"
            className="w-fit f-0"
            value={cardOptions.maxCardWidth ?? "100%"}
            variant="div"
            options={[
              "100%",
              "100px",
              "200px",
              "300px",
              "400px",
              "500px",
              "600px",
              "700px",
              "900px",
            ]}
            onChange={(maxCardWidth) => {
              w.$update(
                { options: { viewAs: { maxCardWidth } } },
                { deepMerge: true },
              );
            }}
          />
          <Select
            label="Card cell min width"
            className="w-fit f-0"
            value={cardOptions.cardCellMinWidth ?? ""}
            variant="div"
            options={[
              "",
              ...[10, 20, 25, 30, 33, 40, 50, 60, 70, 80, 90, 100].map(
                (v) => v + "%",
              ),
            ]}
            onChange={(cardCellMinWidth) => {
              w.$update(
                { options: { viewAs: { cardCellMinWidth } } },
                { deepMerge: true },
              );
            }}
          />
          <FormField
            className="w-fit f-0"
            type="checkbox"
            label="Hide empty card cells"
            value={!!cardOptions.hideEmptyCardCells}
            onChange={(hideEmptyCardCells) => {
              w.$update(
                { options: { viewAs: { hideEmptyCardCells } } },
                { deepMerge: true },
              );
            }}
          />
        </>
      )}
      {w.options.viewAs?.type !== "json" && (
        <>
          <FormField
            className="w-fit f-0"
            type="checkbox"
            label="Show data type sub headers"
            value={!!w.options.showSubLabel}
            onChange={(showSubLabel) => {
              w.$update({ options: { showSubLabel } }, { deepMerge: true });
            }}
          />

          <FormField
            className="w-fit f-0"
            type="number"
            label="Maximum number of characters per column"
            value={w.options.maxCellChars ?? 500}
            onChange={(maxCellChars) => {
              w.$update({ options: { maxCellChars } }, { deepMerge: true });
            }}
          />
          {!cardOptions && (
            <FormField
              label="Max table row height in pixels"
              className="w-fit f-0"
              value={w.options.maxRowHeight ?? 100}
              options={[25, 50, 100, 150, 200, 300, 400, 500, 600, 700, 800]}
              onChange={(maxRowHeight) => {
                w.$update({ options: { maxRowHeight } }, { deepMerge: true });
              }}
            />
          )}
        </>
      )}
    </div>
  );
};
