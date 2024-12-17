import {
  mdiChatQuestion,
  mdiFileCogOutline,
  mdiFunction,
  mdiScriptTextPlay,
  mdiTable,
  mdiTableEdit,
} from "@mdi/js";
import type { SyncDataItem } from "prostgles-client/dist/SyncedTable/SyncedTable";
import type { MethodFullDef } from "prostgles-types";
import { isDefined } from "prostgles-types";
import React from "react";
import type { SimpleFilter } from "../../../commonTypes/filterUtils";
import { isObject } from "../../../commonTypes/publishUtils";
import type { Prgl } from "../App";
import ButtonGroup from "../components/ButtonGroup";
import Loading from "../components/Loading";
import Popup from "../components/Popup/Popup";
import type { SearchListProps } from "../components/SearchList/SearchList";
import SearchList from "../components/SearchList/SearchList";
import Select from "../components/Select/Select";
import type { TableColumn } from "../components/Table/Table";
import type { _Dashboard } from "./Dashboard/Dashboard";
import type { ChartOptions, WindowData } from "./Dashboard/dashboardUtils";
import { SQL_SNIPPETS } from "./W_SQL/SQLSnippets";
import RTComp from "./RTComp";
import type { SQLSuggestion } from "./SQLEditor/SQLEditor";
import type { AnyObject } from "prostgles-types";
import { Icon } from "../components/Icon/Icon";
import { sliceText } from "../../../commonTypes/utils";

export const SEARCH_TYPES = [
  { key: "views and queries", label: "Tables/Queries" },
  { key: "rows", label: "Data" },
  { key: "commands", label: "SQL Snippets" },
] as const;

function triggerCommand(attrPath: string[]) {
  const elem = document.querySelector<HTMLElement>(
    `[data-command="${attrPath[0]}"]`,
  );
  if (elem) {
    elem.focus();
    setTimeout(() => {
      elem.click();
      attrPath.shift();
      if (attrPath.length) {
        triggerCommand(attrPath);
      }
    }, 500);
  } else {
    console.error("Could not find command trigger elem", attrPath);
  }
}

type COMMAND = {
  label: string;
  info: string;
  trigger: () => void;
};

export type DBObject = {
  name: string;
  info: string;
  type: "table" | "view" | "function" | "index" | "type";
  schema: string;
};

type SearchAllSuggestion = Pick<
  SQLSuggestion,
  "schema" | "subLabel" | "name" | "escapedIdentifier" | "definition"
> & { type: "table" | "function" | "view" | "mview" };

export type SearchAllProps = Pick<Prgl, "db" | "methods" | "tables"> & {
  suggestions: SearchAllSuggestion[] | undefined;
  onClose: () => void;
  onOpen: (arg: { table: string; filter: SimpleFilter[] }) => void;
  onOpenDBObject: (
    suggestion: SearchAllSuggestion | undefined,
    method_name?: string,
  ) => void;
  style?: object;
  className?: string;
  searchType?: (typeof SEARCH_TYPES)[number]["key"];
  defaultTerm?: string;
  queries?: SyncDataItem<WindowData<"sql">>[];
  loadTable: _Dashboard["loadTable"];
};

type S = {
  searchTerm: string;
  matches: Match[];
  sType: (typeof SEARCH_TYPES)[number]["key"];
  cols: TableColumn[];
  rows: AnyObject[];
  items?: SearchListProps["items"];
  onSearch?: SearchListProps["onSearch"];
  db_objects: DBObject[];
  loading: boolean;
  tablesToSearch: string[];
  allTablesToSearch: string[];
  currentSearchedTable?: string;
  matchCase?: boolean;
  objTypesToSearch: ("tables" | "queries" | "actions")[];
};

type Match = {
  table: string;
  match: (string | string[])[];
};

export class SearchAll extends RTComp<SearchAllProps, S> {
  constructor(props: SearchAllProps) {
    super(props);

    this.state = {
      searchTerm: "",
      sType:
        props.searchType ?? ("rows" as (typeof SEARCH_TYPES)[number]["key"]),
      matches: [],
      loading: false,
      rows: [],
      cols: [],
      db_objects: [],
      tablesToSearch: [],
      allTablesToSearch: [],
      matchCase: false,
      objTypesToSearch: ["tables", "queries", "actions"],
    };
  }

  onMount() {
    const { defaultTerm = "", db } = this.props;
    const tablesToSearch = Object.keys(db).filter((k) => db[k]?.find);
    const allTablesToSearch = tablesToSearch.slice(0);
    this.setState(
      { searchTerm: defaultTerm, tablesToSearch, allTablesToSearch },
      () => {
        if (defaultTerm) {
          this.searchRows(defaultTerm);
        }
      },
    );
  }

  onDeltaCombined = async (delta, deltaKeys) => {
    if (deltaKeys.includes("searchType") && delta.searchType) {
      this.setState({ sType: delta.searchType });
    }
  };

  static renderRow = (matchRow: Match["match"] | any, key: string | number) => {
    if (!(matchRow && Array.isArray(matchRow))) {
      return null;
    }

    return (
      <div key={key} className="flex-row ws-pre f-1 ">
        {matchRow.map((r, i) => {
          if (typeof r === "string") {
            /** No highlight. Show full row */
            // mxaxWidth: "40%", -> to center the term
            const noRightText = !matchRow[2];
            const style: React.CSSProperties =
              i ?
                { flex: 1 }
              : {
                  display: "flex",
                  flex: noRightText ? undefined : 1,
                  justifyContent: noRightText ? "start" : "end",
                };
            if (matchRow.length === 1) {
              delete style.maxWidth;
              r = sliceText(r.split("\n").join(" "), 25)!;
            }
            return (
              <span
                key={i}
                style={{
                  ...style,
                  maxWidth: "fit-content",
                }}
                className={
                  "fs-1 min-w-0 text-1 text-ellipsis" + (!i ? " " : " ta-left")
                }
              >
                {r}
              </span>
            );
          } else if (Array.isArray(r) && typeof r[0] === "string") {
            /** Highlight. Show bolded */
            return (
              <strong key={i} className="f-0">
                {r[0]}
              </strong>
            );
          } else {
            console.warn("Unexpected $term_highlight item", r);

            return null;
          }
        })}
      </div>
    );
  };

  searching: any;
  searchTerm?: string;
  searchType?: string;
  searchRows = (searchTerm = "") => {
    const { sType, tablesToSearch, matchCase } = this.state;
    const { db, tables } = this.props;

    this.searchTerm = searchTerm; //.trim().toLowerCase();
    if (this.searching) clearTimeout(this.searching);

    this.searching = setTimeout(async () => {
      const term = this.searchTerm + "";

      if (sType === "rows" && db.sql) {
        this.setState({ loading: true });

        // let matches = [];
        this.setState({
          items: undefined,
        });

        // const strf =  getStringFormat(term);
        // const hasChars = strf.some(f => f.type === "c");

        for (const k of tablesToSearch) {
          /** Exclude numeric and timestamp columns when term contains characters  */
          let colsToSearch: "*" | string[] = "*";
          const cols = tables.find((t) => t.name === k)?.columns;
          if (cols) {
            colsToSearch = cols
              .filter(
                (c) =>
                  c.select &&
                  c.filter &&
                  c.udt_name !== "geography" &&
                  c.udt_name !== "geometry" &&
                  (!/[a-z]/i.test(term) || c.tsDataType !== "number"),
              )
              .map((c) => c.name);
          }

          const tableHandler = db[k];
          if (
            tableHandler?.find &&
            this.mounted &&
            colsToSearch.length &&
            term === this.searchTerm
          ) {
            const { matchCase } = this.state;

            this.setState({ currentSearchedTable: k });
            const s = {
                $term_highlight: [
                  colsToSearch,
                  term,
                  { edgeTruncate: 30, matchCase, returnType: "object" },
                ],
              },
              filter = {
                $term_highlight: [
                  colsToSearch,
                  term,
                  { matchCase, returnType: "boolean" },
                ],
              },
              res = await tableHandler.find(filter, {
                select: { $rowhash: 1, s },
                limit: 3,
              }); /** Search top 3 records per table */

            const _matches = res
              .filter((r) => r.s)
              .map((r) => {
                const colName = Object.keys(r.s)[0]!;
                return {
                  $rowhash: r.$rowhash,
                  table: k,
                  colName,
                  match: r.s[colName].map((v, i) =>
                    !i ? `${colName}: ${v}` : v,
                  ),
                };
              });

            if (term === this.searchTerm && this.searchType === "rows") {
              const { onOpen, onClose } = this.props;
              const items: SearchListProps["items"] = _matches.map((m, i) => ({
                ...m,
                key: m.$rowhash + i,
                label: m.table,
                content: (
                  <div
                    className="f-1 flex-row ai-start"
                    title="Open table at row"
                  >
                    <div className="flex-col ai-start f-0 mr-p5 text-1">
                      <Icon
                        path={db[m.table]?.insert ? mdiTableEdit : mdiTable}
                        size={1.5}
                      />
                    </div>
                    <div className="flex-col ai-start f-1">
                      <div className="font-18">{m.table}</div>
                      <div
                        style={{
                          fontSize: "16px",
                          opacity: 0.7,
                          textAlign: "left",
                          width: "100%",
                          marginTop: ".25em",
                        }}
                        className={!this.searchType ? "text-2" : ""}
                      >
                        {SearchAll.renderRow(m.match, i)}
                      </div>
                    </div>
                  </div>
                ),
                onPress: () => {
                  const filter: SimpleFilter[] = [];
                  if (m.colName) {
                    filter.push({
                      fieldName: m.colName,
                      type: "$term_highlight",
                      value: term,
                    });
                  }
                  onOpen({
                    table: m.table,
                    filter,
                  });
                  onClose();
                },
              }));
              if (items.length) {
                this.setState({
                  items: [...(this.state.items || []), ...items],
                });
              }
            } else {
              this.setState({ loading: false });
            }
          }
        }

        this.setState({
          loading: false,
          items: this.state.items || [],
        });

        this.searching = null;
      } else console.error("Unexpected option");
    }, 600);
  };

  getSearchListProps() {
    const { sType, objTypesToSearch } = this.state;
    const { queries, db, suggestions } = this.props;

    this.searchType = sType;

    const placeholder = "Search...";

    let items: SearchListProps["items"],
      dontHighlight = false,
      onSearch: SearchListProps["onSearch"] = undefined;
    const onType: SearchListProps["onType"] = (term, setTerm) => {
      if (sType !== "commands" && term === ">") {
        setTerm("");
        this.setState({ sType: "commands", searchTerm: "" });
      }
    };

    const searchItems: SearchAllSuggestion[] =
      suggestions?.slice(0).filter((s) => {
        return (
          (s.type === "table" || s.type === "view") &&
          s.schema &&
          !["information_schema"].includes(s.schema) &&
          !s.schema.startsWith("pg_")
        );
      }) ??
      Object.entries(db)
        .map(([tableName, handler]) => {
          if ("find" in handler && handler.find) {
            return {
              name: tableName,
              type: "table",
              escapedIdentifier: JSON.stringify(tableName),
              subLabel: "",
            } satisfies SearchAllSuggestion;
          }
        })
        .filter(isDefined);
    if (sType === "views and queries") {
      /** Prioritise public schema */
      items = searchItems
        .filter(
          (s) => s.type === "table" && objTypesToSearch.includes("tables"),
        )
        .map((s) => ({
          key: s.name,
          label: s.name,
          subLabel: s.subLabel,
          contentLeft: (
            <div className="f-0">
              <Icon
                className="text-1p5 p-p25"
                size={1.5}
                path={
                  s.type === "table" ? mdiTable
                  : (s.type as any) === "function" ?
                    mdiFunction
                  : mdiChatQuestion
                }
              />
            </div>
          ),
          onPress: (e, term) => {
            this.props.onClose();
            this.props.onOpenDBObject(s);
          },
        }))
        .concat(
          (objTypesToSearch.includes("queries") ? (queries ?? []) : []).map(
            (q) => ({
              key: q.id,
              label: q.name,
              subLabel: q.sql || "", // sliceText(q.sql || "", 200) ,
              contentLeft: (
                <div className="f-0">
                  <Icon
                    className="text-1p5 p-p25"
                    size={1.5}
                    path={mdiScriptTextPlay}
                  />
                </div>
              ),
              onPress: (e, term) => {
                this.props.onClose();
                let extra = {};
                if (
                  q.sql &&
                  term &&
                  q.sql.toLowerCase().includes(term.toLowerCase())
                ) {
                  const lines = q.sql.split("\n").map((l) => l.toLowerCase());
                  const lineNumber = lines.findIndex((s) =>
                    s.includes(term.toLowerCase()),
                  );
                  const cursorPosition: ChartOptions<"sql">["cursorPosition"] =
                    {
                      column:
                        lines[lineNumber]!.indexOf(term.toLowerCase()) + 1,
                      lineNumber: lineNumber + 1,
                    };

                  extra = { options: { ...(q.options || {}), cursorPosition } };
                }
                q.$update?.({ closed: false, ...extra }, { deepMerge: true });
              },
            }),
          ),
        )
        .concat(
          !objTypesToSearch.includes("actions") ?
            []
          : (Object.entries(this.props.methods as Record<string, MethodFullDef>)
              .filter(([k, v]) => isObject(v) && (v as any).run)
              .map(([methodKey, method]) => ({
                key: methodKey,
                label: methodKey,
                subLabel: Object.keys(method.input).join(", "),
                contentLeft: (
                  <div className="f-0">
                    <Icon
                      className="text-1p5 p-p25"
                      size={1.5}
                      path={mdiFunction}
                    />
                  </div>
                ),
                onPress: (e, term) => {
                  this.props.onClose();
                  this.props.onOpenDBObject(undefined, methodKey);
                },
              })) as any),
        );
    } else if (sType === "commands") {
      items = SQL_SNIPPETS.map((c) => {
        const res: Required<SearchListProps>["items"][number] = {
          ...c,
          key: c.label,
          label: c.label,
          subLabel: c.info + "\n" + c.sql,
          contentLeft: (
            <Icon
              path={mdiFileCogOutline}
              size={1.5}
              className="mr-p5 text-1p5"
            />
          ),
          // mdiFileCogOutline

          onPress: () => {
            this.props.loadTable({ type: "sql", name: c.label, sql: c.sql });
            this.props.onClose();
          },
        };
        return res;
      });
    } else {
      onSearch = this.searchRows;
      dontHighlight = true;
      items = this.state.items; // ?? [];
    }

    return { items, onSearch, onType, dontHighlight, placeholder };
  }

  refInput?: HTMLInputElement;
  render() {
    const {
      loading = false,
      sType,
      tablesToSearch,
      allTablesToSearch,
      currentSearchedTable,
      matchCase,
      objTypesToSearch,
    } = this.state;
    const { defaultTerm, onClose } = this.props;

    const searchListProps = this.getSearchListProps();

    const narrowScreen = window.innerWidth < 600;
    const margin = narrowScreen ? 0 : "2em";

    const selStyle: React.CSSProperties = {
        marginTop: narrowScreen ? ".5em" : "68px",
        flex: "none",
      },
      selClass = "f-0 " + (narrowScreen ? "" : " px-1 ");
    const searchOptsSelect =
      sType === "commands" ? null
      : sType !== "rows" ?
        <Select
          label="Tables/Queries/Actions"
          style={selStyle}
          className={selClass}
          limit={1000}
          options={["tables", "queries", "actions"]}
          value={objTypesToSearch}
          multiSelect={true}
          onChange={(objTypesToSearch) => this.setState({ objTypesToSearch })}
        />
      : <Select
          label="Tables"
          style={selStyle}
          className={selClass}
          limit={1000}
          options={allTablesToSearch}
          value={tablesToSearch}
          multiSelect={true}
          onChange={(tablesToSearch) => this.setState({ tablesToSearch })}
        />;

    const content = (
      <>
        <div
          className="flex-row aai-start w-full min-h-0"
          style={{ width: "hh550px", maxWidth: "88vw", alignSelf: "center" }}
        >
          {!narrowScreen && searchOptsSelect}

          <div className="flex-col min-w-0 min-h-0 f-1">
            <ButtonGroup
              size="small"
              className="o-auto"
              options={SEARCH_TYPES.map((s) => s.label)}
              value={SEARCH_TYPES.find((s) => s.key === sType)?.label}
              style={{ marginRight: "40px", marginBottom: "1em" }}
              onChange={(sLabel) => {
                const sType = SEARCH_TYPES.find((s) => s.label === sLabel)?.key;
                if (sType) {
                  this.setState({ sType });
                }
              }}
            />

            {narrowScreen && searchOptsSelect}

            {sType === "commands" ?
              null
            : !loading || sType !== "rows" ?
              <div style={{ width: "34px", height: "34px" }}></div>
            : <div className={"flex-row f-0 min-h-0 ai-center h-fit "}>
                <Loading sizePx={18} className="f-0 m-p5" show={loading} />
                <div className="f-1 ta-left font-14">{`Searching ${currentSearchedTable} (${tablesToSearch.indexOf(currentSearchedTable!) + 1}/${tablesToSearch.length})`}</div>
              </div>
            }
            <SearchList
              inputProps={{
                "data-command": "SearchAll",
              }}
              matchCase={{
                value: matchCase,
                onChange: (matchCase) => this.setState({ matchCase }),
              }}
              id="search-all-db"
              className={"f-1 min-w-0 flex-col "}
              searchStyle={{ maxWidth: "500px" }}
              defaultSearch={defaultTerm}
              limit={1000}
              noSearchLimit={0}
              {...searchListProps}
            />
          </div>
        </div>
      </>
    );

    return (
      <Popup
        anchorXY={{ x: 20, y: 20 }}
        positioning="inside-top-center"
        title="Quick search"
        contentClassName=" p-1"
        clickCatchStyle={{ opacity: 1 }}
        contentStyle={{ overflow: "unset", paddingTop: "1em" }}
        rootStyle={{
          minHeight: "50vh",
          top: margin,
          right: margin,
          left: margin,
          maxHeight: `calc(100vh - 4em)`,
        }}
        onClose={onClose}
        focusTrap={true}
        autoFocusFirst={{
          selector: "input",
        }}
      >
        {content}
      </Popup>
    );
  }
}
