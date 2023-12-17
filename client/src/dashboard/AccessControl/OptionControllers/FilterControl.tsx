
import React, { useEffect, useState } from 'react'; 
import { DBHandlerClient } from "prostgles-client/dist/prostgles";
import { quickClone } from "../../../utils";
import { getSmartGroupFilter } from "../../SmartFilter/SmartFilter";
import Select from "../../../components/Select/Select";
import { SimpleFilter } from '../../../../../commonTypes/filterUtils';
import { mdiTableEye, mdiTableFilter } from "@mdi/js";
import { MethodHandler, ValidatedColumnInfo } from "prostgles-types";
import Btn from "../../../components/Btn";  
import PopupMenu from "../../../components/PopupMenu";
import SmartTable from "../../SmartTable";
import { pluralise } from "../../../pages/Connections/Connection";
import { Label } from "../../../components/Label";
import { DBSchemaTablesWJoins } from "../../Dashboard/dashboardUtils";
import { RenderFilter } from "../../RenderFilter";
import { usePromise, useReactiveState } from "../../ProstglesMethod/hooks";
import { FlexCol, FlexRowWrap } from "../../../components/Flex";
import { themeR } from "../../../App";


export type ContextDataSchema = { 
  name: string; 
  columns: ValidatedColumnInfo[] 
}[];

export type SingleGroupFilter = { $and: SimpleFilter[] } | { $or: SimpleFilter[] };

export type ForcedFilterControlProps = {
  detailedFilter?: SingleGroupFilter;
  db: DBHandlerClient;
  methods: MethodHandler;
  tables: DBSchemaTablesWJoins;
  tableName: string;
  onChange: (val?: SingleGroupFilter) => any;
  contextData: ContextDataSchema;
  iconPath?: string;
  label: string;
  info?: React.ReactNode;
  title?: React.ReactNode;
  containerClassname?: string;
  onSetError: (error?: string) => void;
  mode?: "forcedFilter" | "checkFilter";
}


const OPTS = [
  { key: "disabled", label: "all data",     ["data-command"]: "ForcedFilterControl.type.disabled" },
  { key: "enabled",  label: "filtered data", ["data-command"]: "ForcedFilterControl.type.enabled" },
] as const;
const OPTS_CHECK = [
  { key: "disabled", label: "Disabled",      ["data-command"]: "CheckFilterControl.type.disabled" },
  { key: "enabled",  label: "Enabled",      ["data-command"]: "CheckFilterControl.type.enabled" },
] as const;


export const FilterControl = (props: ForcedFilterControlProps) => {
  const { 
    onChange: setF, 
    detailedFilter: _detailedFilter, 
    iconPath = mdiTableFilter, 
    label, info, title, containerClassname = "  ",
    tableName,
    db,
    mode = "forcedFilter",
  } = props;
  const { state: theme } = useReactiveState(themeR);

  const detailedFilter = quickClone(_detailedFilter);

  
  const [o, setO] = useState<typeof OPTS[number]["key"]>(detailedFilter? "enabled" : "disabled");

  useEffect(() => {
    setO(detailedFilter? "enabled" : "disabled");
  }, [detailedFilter]);

  const isAnd = detailedFilter && "$and" in detailedFilter;
  const filters = !detailedFilter? [] : isAnd? detailedFilter.$and :  detailedFilter.$or;

  const tableHandler = db[tableName]
  const rowCount = usePromise(async () => tableHandler!.count!(getSmartGroupFilter(filters, undefined, isAnd? "and" : "or")), [detailedFilter]);
  const isCheck = mode === "checkFilter";
  const ViewDataBtn = isCheck? null : <div className="ml-2  flex-row ">

    <PopupMenu 
      title="Filtered records"
      contentStyle={{ 
        padding: 0,
        minHeight: "200px",
      }}
      className="ml-auto"
      positioning="center"
      button={
        <Btn iconPath={mdiTableEye} >
          {rowCount} {pluralise(+rowCount!, "row")}
        </Btn>
      }
      render={pClose => (
        <SmartTable
          theme={theme}
          title={({  filteredRows, totalRows }) => (<div className="flex-row ai-center gap-p25 ws-pre jc-center bg-1 p-1">
            <div className="bold">{filteredRows.toLocaleString()} records</div>
            {filters.length > 0 && <>
              from a total of
              <div>{totalRows.toLocaleString()}</div>
            </>}
            
          </div>)}
          db={props.db}
          methods={props.methods}
          tableName={props.tableName}
          tables={props.tables}
          filterOperand={isAnd? "and" : "or"}
          filter={filters}
          onFilterChange={newFilter => {
            props.onChange({ $and: newFilter });
          }}
        />
      )}
    />
  </div>;

  const compType = isCheck? "CheckFilterControl" : "ForcedFilterControl";
  return <FlexCol 
    className={`${compType} gap-p5`}
    style={{ minWidth: "500px" }}
    data-command={compType}
  >
    <FlexRowWrap>
      <Label iconPath={iconPath} label={label} info={info} popupTitle={title} />
      <Select 
        data-command={`${compType}.type`}
        fullOptions={isCheck? OPTS_CHECK : OPTS}
        value={o}
        onChange={o => {
          if(o === "disabled"){
            setF(undefined);
          } else {
            setF({ $and: [] });
          }
        }}
      />
      {ViewDataBtn}
    </FlexRowWrap>

    {o !== "disabled" && 
      <FlexRowWrap 
        className={"FilterList ai-center p-1 ml-3 " + containerClassname}
      > 
        <RenderFilter {...props} 
          filter={detailedFilter}
          asPopup={{
            mode: "compact"
          }}
          onChange={setF} 
        /> 
      </FlexRowWrap> 
    }
  </FlexCol>
}
