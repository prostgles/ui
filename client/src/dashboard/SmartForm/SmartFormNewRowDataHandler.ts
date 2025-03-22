import {
  getObjectEntries,
  isDefined,
  isEmpty,
  type AnyObject,
} from "prostgles-types";
import type { Media } from "../../components/FileInput/FileInput";

export type NewRow = Record<string, ColumnData>;

type Opts = {
  onChange: (
    newRow: NewRow,
    columnName: string,
    newData: ColumnData,
  ) => NewRow | Promise<NewRow>;
  onChanged: (newRow: NewRow) => void;
};
export class NewRowDataHandler {
  private newRow: NewRow | undefined;
  private onChange: Opts["onChange"];
  private onChanged: Opts["onChanged"];
  constructor(newRow: NewRow | undefined, { onChange, onChanged }: Opts) {
    this.newRow = newRow;
    this.onChanged = (newRow) => onChanged({ ...newRow });
    this.onChange = onChange;
  }

  getNewRow = () => ({ ...this.newRow });

  setNewRow = (newRow: NewRow) => {
    this.newRow = newRow;
    this.onChanged(this.newRow);
  };

  setColumnData = async (columnName: string, newData: ColumnData) => {
    this.newRow ??= {};
    if (newData.value === undefined) {
      delete this.newRow[columnName];
    } else {
      this.newRow[columnName] = newData;
    }
    this.newRow = await this.onChange(this.newRow, columnName, newData);
    this.onChanged(this.newRow);
  };

  setNestedColumn = (
    columnName: string,
    value: Extract<ColumnData, { type: "nested-column" }>["value"],
  ) => {
    this.setColumnData(columnName, {
      type: "nested-column",
      value,
    });
  };
  setNestedTable = (
    columnName: string,
    value: Extract<ColumnData, { type: "nested-table" }>["value"],
  ) => {
    this.setColumnData(columnName, {
      type: "nested-table",
      value,
    });
  };

  setColumn = (
    columnName: string,
    value: Extract<ColumnData, { type: "column" }>["value"],
  ) => {
    this.setColumnData(columnName, {
      type: "column",
      value,
    });
  };

  getNestedColumnData = (columnName: string): AnyObject | undefined => {
    const colData = this.newRow?.[columnName];
    if (colData?.type !== "nested-column") return undefined;
    if (colData.value instanceof NewRowDataHandler) {
      return colData.value.getRow();
    }
    return colData.value;
  };

  getNestedTableData = (columnName: string): AnyObject[] | undefined => {
    const colData = this.newRow?.[columnName];
    if (colData?.type !== "nested-table") return undefined;
    return colData.value
      .map((v) => (v instanceof NewRowDataHandler ? v.getRow() : v))
      .filter(isDefined);
  };

  getRow = (
    filterFunc?: (data: ColumnData) => boolean,
  ): AnyObject | undefined => {
    const result =
      this.newRow &&
      Object.fromEntries(
        getObjectEntries(this.newRow)
          .filter(([_, v]) => filterFunc?.(v) ?? true)
          .map(([key, { type, value: valueOrNewRowData }]) => {
            if (type === "nested-table" && Array.isArray(valueOrNewRowData)) {
              return [
                key,
                valueOrNewRowData.map((v) =>
                  v instanceof NewRowDataHandler ? v.getRow() : v,
                ),
              ];
            }
            if (
              type === "nested-column" &&
              valueOrNewRowData instanceof NewRowDataHandler
            ) {
              return [key, valueOrNewRowData.getRow()];
            }
            return [key, valueOrNewRowData];
          }),
      );
    if (isEmpty(result)) return undefined;
    return result;
  };
}

export type ColumnData =
  | {
      type: "column";
      value: any;
    }
  | {
      /**
       * Added from the fkey column
       */
      type: "nested-column";
      value: AnyObject | NewRowDataHandler | undefined;
    }
  | {
      /**
       * References the file table
       */
      type: "nested-file-column";
      value: Media | undefined;
    }
  | {
      /**
       * Added from the JoinedRecords
       */
      type: "nested-table";
      value: (AnyObject | NewRowDataHandler)[];
    };
