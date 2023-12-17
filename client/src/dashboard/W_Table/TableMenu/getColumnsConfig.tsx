import { TableHandlerClient } from "prostgles-client/dist/prostgles";
import { WindowSyncItem } from "../../Dashboard/dashboardUtils";


export type ColumnsConfig = {
  name: string;
  show?: boolean;
  computed?: boolean;
}[];

export const getColumnsConfig = async (dbTbl: TableHandlerClient, w: WindowSyncItem<"table">, updateW = false): Promise<ColumnsConfig> => {

  try {

    if(!dbTbl.getColumns) return [];
    const columnsConfig: ColumnsConfig = (await dbTbl.getColumns())
      .map(c => ({ name: c.name, show: true, tsDataType: c.tsDataType, computed: false }));

    let res = columnsConfig;
    if(w?.columns && Array.isArray(w.columns)){

      if(w.columns.map(c => c.name).sort().join() !== columnsConfig.map(c => c.name).sort().join()){
        /* Remove missing columns */
        //@ts-ignore
        let newCols = w.columns
          .map(c => ({ ...c }))
          .filter(c => columnsConfig.find(c1 => c1.name === c.name || c1.name === c.computedConfig?.column))

        /* Add missing columns */
        const missingCols = columnsConfig.filter(c1 => !newCols.find(nc => nc.name === c1.name))
          .map(c => ({ name: c.name, show: true }));

        newCols = newCols.concat(missingCols);
        if(updateW) await w.$update!({ columns: newCols });
        res = newCols
      }

    } else if(w) {
      if(updateW) await w.$update!({ columns: columnsConfig });
    }

    return res;
  } catch(e){
    console.error(e);
    throw e;
  }
}