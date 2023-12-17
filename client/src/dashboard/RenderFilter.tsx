import React from "react";
import { GroupedDetailedFilter, SimpleFilter } from "../../../commonTypes/filterUtils";
import { pickKeys } from "../utils";
import { ContextDataSchema, ForcedFilterControlProps, SingleGroupFilter } from "./AccessControl/OptionControllers/FilterControl";
import SmartFilter from "./SmartFilter/SmartFilter";
import PopupMenu from "../components/PopupMenu";
import { FlexCol, FlexRowWrap } from "../components/Flex";
import { InfoRow } from "../components/InfoRow";
import Btn from "../components/Btn";
import { mdiFilter, mdiPencil } from "@mdi/js";
import SmartAddFilter from "./SmartFilter/SmartAddFilter";

type RenderFilterProps = {
  filter: SingleGroupFilter | undefined;
  onChange: (filter: SingleGroupFilter) => void;
  contextData: ContextDataSchema | undefined;
  asPopup?: {
    title?: string;
    mode: "micro" | "compact"
  };
} & Pick<ForcedFilterControlProps, "db" | "tableName" | "tables">;

export const RenderFilter = ({ filter: f = { $and: [] }, onChange, contextData, asPopup, ...props }: RenderFilterProps) => {

  if("$and" in f || "$or" in f){
    const isAnd = "$and" in f;
    const filters = isAnd? f.$and : f.$or;
    const simpleFilters = filters.filter(isSimpleFilter);
    const groupFilters = filters.filter(isNotSimpleFilter);

    const content = (minimised?: boolean, showAddFilter?: boolean) =>  (
      <>
        {!filters.length &&
          <InfoRow color="info" variant="filled">
            No filters
          </InfoRow>
        }
        <SmartFilter
          contextData={contextData}
          variant={minimised? "row" : window.isMobileDevice? undefined : "row"}
          filterClassName={(minimised ?? filters?.some(f => f.minimised))? " " : " rounded  b b-blue-500"}
          {...pickKeys(props, ["db", "tableName", "tables"])}
          operand={isAnd? "AND" : "OR"}
          detailedFilter={simpleFilters}
          onOperandChange={operand => {
            onChange(operand === "AND"? 
              { $and: filters } : 
              { $or: filters }
            );
          }}
          onChange={newF => {
            // console.log(newF)
            const newFilters = [...newF, ...groupFilters];
            if(isAnd) f.$and = newFilters;
            else f.$or = newFilters;
            onChange(f);
          }}
          hideToggle={true}
          minimised={minimised}
          showAddFilter={showAddFilter}
        />
      </>
    );

    if(asPopup){
      const title = asPopup.title ?? "Edit filters";

      // if(!filters.length){
      //   return <SmartAddFilter 
      //     {...pickKeys(props, ["db", "tableName", "tables"])}
      //     defaultType="="
      //     style={{ 
      //       boxShadow: "unset"
      //     }}
      //     className=" text-active"
      //     variant="full"
      //     onChange={newF => {
      //       onChange({ $and: newF });
      //     }}
      //     btnProps={{
      //       variant: "faded"
      //     }}
      //   />
      // }
      
      const filterIsNotEmpty = filters.some(f => !f.disabled)
      const toggleButton = asPopup.mode === "compact"? 
        <FlexRowWrap>
          <div style={{ pointerEvents: "none" }}>
            {content(true, false)}
          </div>
          <Btn 
            title={title}
            iconPath={mdiPencil} 
            color="action"
            variant="icon"
            data-command="RenderFilter.edit"
          />
        </FlexRowWrap> :
        <Btn 
          title={title}
          iconPath={mdiFilter} 
          variant="icon"
          data-command="RenderFilter.edit"
          color={filterIsNotEmpty? "action" : undefined}
        />

      return <PopupMenu
        title={title}
        onClickClose={false}
        button={toggleButton}
        contentStyle={{
          minWidth: "400px",
        }}
        clickCatchStyle={{ opacity: .5 }}
        footerButtons={[
          { 
            onClickClose: true,
            color: "action",
            variant: "filled",
            label: "Done",
            "data-command": "RenderFilter.done",
            disabledInfo: filters.some(f => f.disabled)? "Some filters are incomplete/disabled" : undefined
          }
        ]}
      >
        {content(false, true)}
      </PopupMenu>
    }

    return content();
  } else {
    return <>Unexpected filter. Expecting $and / $or</>
  }
    
}


const isSimpleFilter = (f: SimpleFilter | GroupedDetailedFilter): f is SimpleFilter => {
  return !("$and" in f || "$or" in f);
}
const isNotSimpleFilter = (f: SimpleFilter | GroupedDetailedFilter): f is GroupedDetailedFilter => {
  return !isSimpleFilter(f);
}