import type { DBHandlerClient } from "prostgles-client/dist/prostgles";
import type { DBSchemaTable } from "prostgles-types";
import { asName, getKeys } from "prostgles-types";
import React from "react";
import Btn from "../../../../components/Btn";
import ErrorComponent from "../../../../components/ErrorComponent";
import { FlexCol, FlexRow } from "../../../../components/Flex";
import { getStringFormat } from "../../../../utils";
import type { CommonWindowProps } from "../../../Dashboard/Dashboard";
import type { DBSchemaTablesWJoins } from "../../../Dashboard/dashboardUtils";
import { debounce } from "../../../Map/DeckGLWrapped";
import type { DeltaOf } from "../../../RTComp";
import RTComp from "../../../RTComp";
import { SQLSmartEditor } from "../../../SQLEditor/SQLSmartEditor";
import { ColumnEditor } from "./ColumnEditor";
import { getAlterFkeyQuery } from "./ReferenceEditor";
import { AlterColumnFileOptions } from "./AlterColumnFileOptions";
import type { Prgl } from "../../../../App";
import {
  type ColumnConstraint,
  getColumnConstraints,
} from "./alterColumnUtilts";

export type AlterColumnProps = Pick<CommonWindowProps, "suggestions"> & {
  prgl: Prgl;
  table: DBSchemaTable;
  field: string;
  db: DBHandlerClient;
  tables: DBSchemaTablesWJoins;
  onClose: VoidFunction;
};

type S = {
  query: string;
  queryAge: number;
  error?: string;
  hint?: string;
  editableQuery: boolean;
  running: boolean;
  onSuccess: () => void;
  field: string;
  edited?: {
    name?: string;
    isPkey?: boolean;
    dataType?: string;
    notNull?: boolean;
    defaultValue?: string;
    references?: {
      ftable: string;
      onDelete?: string;
      onUpdate?: string;
    };
  };
  showMore?: boolean;
  constraints?: ColumnConstraint[];
  showCreateQuery?: boolean;
  fKeysLoaded?: boolean;

  defaultValue?: any;
  notNull?: boolean;
  dataType?: string;
  newName?: string;
};

export class AlterColumn extends RTComp<AlterColumnProps, S> {
  state: S = {
    query: "",
    queryAge: 0,
    error: "",
    hint: "",
    field: "",
    editableQuery: true,
    running: false,
    onSuccess: () => {},
  };

  setConstraints = debounce(async () => {
    const { table, db, field } = this.props;
    if (!db.sql || !field) return;
    const constraints = await getColumnConstraints(table.name, field, db.sql);
    this.setState({ constraints });
  }, 100);

  async onDeltaCombined(
    delta: DeltaOf<AlterColumnProps> & DeltaOf<S>,
  ): Promise<void> {
    const deltaKeys = getKeys(delta ?? {});
    if (deltaKeys.includes("queryAge") || !this.state.constraints) {
      this.setConstraints();
    }
  }

  onNewDataType = async (
    args: Pick<Required<S>["edited"], "dataType" | "notNull" | "defaultValue">,
  ) => {
    const { table, db } = this.props;

    const field = JSON.stringify(this.state.field || this.props.field);

    const col = table.columns.find((c) => c.name === field);

    const tableName = table.name;

    const {
      dataType: newType,
      defaultValue,
      notNull,
    } = { ...this.state, ...args };

    const usingCol = ` NULLIF(${field}::TEXT, '') `;
    let using = `USING  ${usingCol}::${newType}`;

    const alterColQuery =
      `ALTER TABLE ${tableName} \n` + `ALTER COLUMN ${field} \n`;

    let query = "";

    if (
      typeof newType === "string" &&
      newType !== col?.data_type.toUpperCase()
    ) {
      if (newType.startsWith("TIMESTAMP") || newType === "DATE") {
        using = `USING to_timestamp(${usingCol}, 'YYYY-MM-DD HH:MI:SS')::${newType}`;

        const value = await db.sql!(
          `SELECT ${field} FROM ${tableName} WHERE  ${field} IS NOT NULL LIMIT 1`,
          {},
          { returnType: "value" },
        );

        if (value) {
          if (isNumeric(value)) {
            using = `USING to_timestamp(cast(${usingCol} as BIGINT))::${newType}`;
          } else {
            const format = getStringFormat(value);
            const formatStr = format
              .map((f) =>
                f.type === "n" ? "N".repeat(f.len) : `${f.val}`.repeat(f.len),
              )
              .join("");
            const knownFormats = [
              { format: "NN NN NNNN", pg_format: "DD MM YYYY HH24:MI:SS" },
              {
                format: "NN NN NNNN NN:NN:NN",
                pg_format: "DD MM YYYY HH24:MI:SS",
              },
              {
                format: "NN NN NNNN NN:NN:NN.NNNZ",
                pg_format: "DD MM YYYY HH24:MI:SS.MSZ",
              },
              {
                format: "NNNN-NN-NN NN:NN:NN",
                pg_format: "YYYY-MM-DD HH24:MI:SS",
              },
              {
                format: "NNNN-NN-NNTNN:NN:NN",
                pg_format: "YYYY-MM-DDTHH24:MI:SS",
              },
              {
                format: "NNNN-NN-NN NN:NN:NN.NNNZ",
                pg_format: "YYYY-MM-DD HH24:MI:SS.MSZ",
              },
              {
                format: "NNNN-NN-NNTNN:NN:NN.NNNZ",
                pg_format: "YYYY-MM-DDTHH24:MI:SS.MSZ",
              },
            ];
            const pgFormat = knownFormats.find((kf) => formatStr === kf.format);
            const mask = (pgFormat ?? knownFormats[0]!).pg_format;
            using = `USING to_timestamp(${usingCol}, '${mask}')::${newType}`;
          }
        }

        if (newType === "TIMESTAMPZ") using += `at time zone 'utc'`;
      } else if (newType.startsWith("GEO")) {
        using =
          `USING st_transform( \n` +
          ` st_setsrid( \n` +
          `   st_geometryfromtext( \n` +
          `        'POINT' || replace(${usingCol}, ',', ' ')  \n` +
          `   ), \n` +
          `   27700 \n` +
          ` ), \n` +
          ` 4326 \n` +
          `)`;
      }

      query = alterColQuery + `TYPE ${newType} \n` + using + ";";
    }

    if (typeof notNull === "boolean" && !notNull !== col?.is_nullable) {
      query +=
        `\n\n` + alterColQuery + (notNull ? "SET NOT NULL;" : "DROP NOT NULL;");
    }

    if (defaultValue !== undefined) {
      query +=
        `\n\n` +
        alterColQuery +
        `SET DEFAULT ${col?.tsDataType === "string" ? `'${defaultValue}'` : defaultValue};`;
    }

    this.setState({
      edited: { dataType: newType },
      editableQuery: true,
      query,
      ...args,
      error: undefined,
    });
  };

  render() {
    const { table, db, tables, prgl } = this.props;

    const isCreate = !this.props.field;
    const field = this.state.field || this.props.field;

    const col = table.columns.find((c) => c.name === field);

    const { edited, query = "", constraints, showCreateQuery } = this.state;

    const tableName = table.name;

    const tName = tableName;
    const cName = JSON.stringify(field);
    const alter = `ALTER TABLE ${tName} \n`;
    const alterColQuery = `${alter}${!isCreate ? "ALTER" : "ADD"} COLUMN ${cName}\n`;

    const resetEdit = () => {
      this.setState({ edited: undefined, query: "" });
    };

    const dropConstraint = async (conName: string, endQuery = "") => {
      const pkCon = constraints?.find((c) => c.constraint_name === conName);
      if (pkCon) {
        this.setState({
          query: `${alter}DROP CONSTRAINT ${asName(pkCon.constraint_name)};\n\n${endQuery}`,
        });
      }
    };

    if (!col)
      return <ErrorComponent error={`Column ${this.props.field} not found`} />;
    const pkeyCons = constraints?.find(
      (c) => c.constraint_type === "PRIMARY KEY",
    );
    const fkeyCons =
      constraints?.filter((c) => c.constraint_type === "FOREIGN KEY") ?? [];

    return (
      <FlexCol className="f-1 flex-col p-1 o-auto">
        <FlexCol className="gap-2">
          <ColumnEditor
            isAlter={true}
            tableName={tableName}
            suggestions={this.props.suggestions}
            tables={tables}
            name={col.name}
            notNull={!col.is_nullable}
            defaultValue={col.column_default}
            isPkey={col.is_pkey}
            references={fkeyCons.map((c) => ({
              fCol: c.foreign_column_name!,
              ftable: c.foreign_table_name!,
              onDelete: c.delete_rule?.toUpperCase(),
              onUpdate: c.update_rule?.toUpperCase(),
            }))}
            onAddReference={(c, r) => {
              this.setState({
                query: getAlterFkeyQuery({ ...r, col: field, tableName }),
              });
            }}
            dataType={edited?.dataType ?? col.udt_name.toUpperCase()}
            onEditReference={(r, i) => {
              this.setState({
                query: `${alter}DROP CONSTRAINT ${asName(fkeyCons[i]!.constraint_name)};\n\n${r ? getAlterFkeyQuery({ ...r, col: field, tableName }) : ""}`,
              });
            }}
            onChange={(k, val) => {
              if (k === "name") {
                const { name: newName } = val;
                this.setState({
                  newName,
                  edited: { name: newName },
                  editableQuery: false,
                  query: `ALTER TABLE ${tName} \nRENAME COLUMN ${JSON.stringify(field)} \nTO ${JSON.stringify(newName)} `,
                });
              } else if (k === "dataType") {
                this.onNewDataType({ dataType: val.dataType });
              } else if (k === "isPkey") {
                if (!pkeyCons) {
                  this.setState({
                    edited: { isPkey: val.isPkey },
                    query: `${alter}ADD PRIMARY KEY (${cName}) \n`,
                  });
                } else {
                  dropConstraint(pkeyCons.constraint_name);
                }
              } else if (k === "notNull") {
                const { notNull } = val;
                if (
                  typeof notNull === "boolean" &&
                  !notNull !== col.is_nullable
                ) {
                  this.setState({
                    notNull,
                    edited: { notNull },
                    query:
                      alterColQuery +
                      (notNull ? "SET NOT NULL;" : "DROP NOT NULL;"),
                  });
                } else {
                  resetEdit();
                }
              } else if (k === "defaultValue") {
                const { defaultValue } = val;
                if (defaultValue !== col.column_default) {
                  const q =
                    defaultValue === undefined ? "DROP DEFAULT;" : (
                      `SET DEFAULT ${col.tsDataType === "string" ? `'${defaultValue}'` : defaultValue};`
                    );
                  this.setState({
                    defaultValue,
                    edited: { defaultValue },
                    query: alterColQuery + q,
                  });
                } else {
                  resetEdit();
                }
              }
            }}
          />
          {table.info.fileTableName && (
            <AlterColumnFileOptions
              columnName={col.name}
              tableName={tableName}
              {...prgl}
            />
          )}
          <FlexRow>
            <Btn onClick={this.props.onClose} variant="outline">
              Cancel
            </Btn>
            <Btn
              color="danger"
              variant="faded"
              onClick={() => {
                this.setState({
                  query: `${alter}DROP COLUMN ${cName}\n"delete this line to confirm"`,
                });
              }}
            >
              DROP ...
            </Btn>
          </FlexRow>
        </FlexCol>

        {query && (!isCreate || showCreateQuery) && (
          <SQLSmartEditor
            query={query}
            sql={db.sql!}
            title={isCreate ? "Create column query" : "Alter column query"}
            suggestions={this.props.suggestions}
            onCancel={() => {
              this.setState({ query: "" });
            }}
            onSuccess={() => {
              this.props.onClose();
              this.setState({
                query: "",
                queryAge: Date.now(),
                edited: undefined,
              });
            }}
          />
        )}
      </FlexCol>
    );
  }
}

export const isNumeric = (str: any) => {
  str = str + "";
  if (typeof str != "string") return false; // we only process strings!
  return (
    !isNaN(str as unknown as number) && // use type coercion to parse the _entirety_ of the string (`parseFloat` alone does not do this)...
    !isNaN(parseFloat(str))
  ); // ...and ensure strings of whitespace fail
};
