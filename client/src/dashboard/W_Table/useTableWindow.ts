import { useEffect, useRef, useState } from "react";
import { isEqual } from "prostgles-types";
import type { W_TableProps } from "./W_Table";
import { getAndFixWColumnsConfig } from "./TableMenu/getAndFixWColumnsConfig";
import { getSort } from "./tableUtils/tableUtils";

export const useTableWindow = (props: W_TableProps) => {
  const [w, setWindow] = useState(props.w);
  const latest = useRef({ props, w });
  latest.current = { props, w };
  const cloneSync = props.w.$cloneSync;
  const { tables, db, dbKey } = props.prgl;
  const tableHandler = db[w.table_name];

  useEffect(() => {
    let active = true;
    const initialWindow = latest.current.props.w;
    if (!Array.isArray(initialWindow.filter)) {
      void initialWindow.$update({ filter: [] });
    }
    const subscription = cloneSync((window, delta) => {
      if (!active) return;
      setWindow(window);
      if (delta && !delta.id && ("filter" in delta || "having" in delta)) {
        latest.current.props.onForceUpdate();
        if (!window.options.showFilters) {
          void window.$update(
            { options: { showFilters: true } },
            { deepMerge: true },
          );
        }
      }
    });
    return () => {
      active = false;
      subscription.$unsync();
    };
  }, [cloneSync]);

  useEffect(() => {
    const window = latest.current.w;
    if (!tableHandler) {
      if (!window.table_oid) return;
      const renamedTable = tables.find(({ oid }) => oid === window.table_oid);
      if (renamedTable) {
        void window.$update({ table_name: renamedTable.name });
      } else {
        const emptyConfig = {
          columns: null,
          filter: [],
          having: [],
          sort: null,
        };
        if (
          Object.entries(emptyConfig).some(
            ([key, value]) => !isEqual(window[key], value),
          )
        ) {
          void window.$update(emptyConfig);
        }
      }
      return;
    }
    void getAndFixWColumnsConfig(tables, window);
  }, [dbKey, tables, tableHandler, w.table_name, w.table_oid]);

  useEffect(() => {
    if (w.columns?.length && w.sort?.length) {
      const allowedSortKeys = new Set(getSort(tables, w).map(({ key }) => key));
      const sort = w.sort.filter(({ key }) => allowedSortKeys.has(key));
      if (sort.length !== w.sort.length) {
        void w.$update({ sort });
      }
    }
  }, [w, tables]);

  return w;
};
