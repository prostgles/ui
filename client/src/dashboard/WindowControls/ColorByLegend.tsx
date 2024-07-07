import React from "react";
import type { DivProps} from "../../components/Flex";
import { FlexRow, classOverride } from "../../components/Flex";
import type { CommonWindowProps } from "../Dashboard/Dashboard"
import type { WindowSyncItem } from "../Dashboard/dashboardUtils";
import { PALETTE } from "../Dashboard/dashboardUtils";
import { ColorPicker } from "../W_Table/ColumnMenu/ColorPicker";
import { updateWCols } from "../W_Table/tableUtils/tableUtils";
import { useEffectAsync } from "../DashboardMenu/DashboardMenuSettings";
import { type ColumnValue, setDefaultConditionalStyle } from "../W_Table/ColumnMenu/ColumnStyleControls";
import type { ColumnConfig } from "../W_Table/ColumnMenu/ColumnMenu";

type P = DivProps & Pick<CommonWindowProps, "getLinksAndWindows" | "myLinks" | "prgl"> & {
  layerLinkId: string;
  groupByColumn: string;
  onChanged: VoidFunction;
}
export const ColorByLegend = ({ className, style, onChanged, ...props}: P) => {
  const { prgl: { db }, groupByColumn } = props;
  const { getColor, valueStyles, oldLayerWindow } = getGroupByValueColor(props);
  const latestCols = oldLayerWindow?.$get().columns;
  const currCol = latestCols?.find(c => c.name === props.groupByColumn);

  const setColumnStyle = (newStyle: ColumnConfig["style"]) => {
    if(!oldLayerWindow) return;
    const newCols = latestCols?.map(c => c.name === props.groupByColumn? {
      ...c,
      style: newStyle
    } : c)
    updateWCols(oldLayerWindow, newCols);
    onChanged();
  }

  /** Add group by colors */
  useEffectAsync(async () => {
    if(!valueStyles && oldLayerWindow?.table_name){
      setDefaultConditionalStyle(db, oldLayerWindow.table_name, groupByColumn, newStyle => {
        setColumnStyle(newStyle)
      });
    }
  }, [valueStyles]);

  if(!valueStyles?.length) return null;

  const getConditionLabel = (condition: ColumnValue | ColumnValue[]): string => {
    if(Array.isArray(condition)) return condition.map(c => getConditionLabel(c)).join(", ");
    if(condition === null) return "null";
    if(condition === undefined) return "undefined";
    return condition.toString();
  }
  return <FlexRow className={classOverride("ColorByLegend", className)} style={style}>
    {valueStyles.map((s, i) => 
      <ColorPicker 
        key={i} 
        value={getColor(s.condition, i)} 
        label={getConditionLabel(s.condition)}
        variant="legend"
        onChange={newColor => {
          const currColStyle = (!currCol?.style || currCol.style.type !== "Conditional")? undefined : currCol.style
          if(!currColStyle) return;
          setColumnStyle({
            ...currColStyle,
            conditions: currColStyle.conditions.map(c => c.condition === s.condition? {
              ...s,
              textColor: newColor
            } : c)
          });
        }} 
      />
    )}
  </FlexRow>
}

export const getGroupByValueColor = ({ getLinksAndWindows, myLinks, layerLinkId, groupByColumn }: Omit<P, "onChanged">) => {

  const { windows } = getLinksAndWindows();
  const thisLink = myLinks.find(l => l.id === layerLinkId);
  const oldLayerWindow = !thisLink? undefined : windows.find(w => w.type === "table" && [thisLink.w1_id, thisLink.w2_id].includes(w.id)) as WindowSyncItem<"table">;
  const layerWindow = oldLayerWindow?.$get();
  const gbCol = oldLayerWindow?.$get().columns?.find(c => c.name === groupByColumn);
  const style = gbCol?.style;
  const valueStyles = style?.type === "Conditional" && style.conditions.length && style.conditions.every(c => c.operator === "=")? style.conditions : undefined
  const getColor = (value: any, valueIndex: number) => {
    if(valueStyles){
      const valueStyle = valueStyles.find(c => c.condition === value);
      if(valueStyle){
        const color = valueStyle.textColor || valueStyle.chipColor || valueStyle.cellColor;
        if(color) return color; 
      }
    }
    return  (PALETTE[`c${valueIndex}`] ?? PALETTE.c1).get()
  }

  return {
    getColor, valueStyles, layerWindow, oldLayerWindow
  }
}