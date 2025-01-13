import { mdiClose } from "@mdi/js";
import type { AnyObject, DBHandler, TableSchema } from "prostgles-types";
import { DBSchema } from "prostgles-types";
import React from "react";
import Btn from "../../components/Btn";
import type { DBS } from "../Dashboard/DBS";
import type { DBSchemaTablesWJoins } from "../Dashboard/dashboardUtils";

type P = {
  db: DBHandler | DBS;
  tableName: string;
  filter: AnyObject;
  tables: TableSchema[] | DBSchemaTablesWJoins;
};
export const DeleteRecordCascade = (p: P) => {
  return (
    <Btn
      iconPath={mdiClose}
      onClickPromise={async () => {
        await deleteCascade(p);
      }}
    />
  );
};

export const deleteCascade = async (
  { db, tableName, filter, tables }: P,
  prevTables?: string[],
) => {
  const refChain: {
    table: string;
    count: any;
    delete: () => Promise<void>;
  }[] = [];

  for await (const t of (tables as TableSchema[]).filter(
    (t) => !prevTables?.includes(t.name),
  )) {
    if (t.columns.some((c) => c.references?.[0]?.ftable === tableName)) {
      const refFilter = { $existsJoined: { [tableName]: filter } };
      const count = await db[t.name]?.count?.(refFilter);
      if (count && db[t.name]?.delete) {
        const d = {
          table: t.name,
          count,
          delete: () => db[t.name]?.delete?.(refFilter),
        };
        refChain.push(d);
      }
    }
  }
  // const referencingTables = (tables as TableSchema[]).filter(t =>
  //    &&

  // );
  // const referencedRecords = await Promise.all(referencingTables.map(async (t) => {
  //   const refFilter = { $existsJoined: { [t.name]: filter } }
  //   const count = await db[t.name]?.count?.(refFilter);
  //   if(count && db[t.name]?.delete){
  //     return {
  //       table: t.name,
  //       count,
  //       delete: () => db[t.name]?.delete?.(refFilter)
  //     }
  //   }
  // }));
  console.error(refChain);
  // if(referencedRecords.length){
  //   return
  // }
  return refChain;
};
