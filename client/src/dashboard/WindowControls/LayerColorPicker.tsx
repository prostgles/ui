import React from "react"
import { LinkSyncItem } from "../Dashboard/dashboardUtils";
import { ColorPicker, RGBA } from "../W_Table/ColumnMenu/ColorPicker";

type P = {
  link: LinkSyncItem;
  column: string;
  myLinks: LinkSyncItem[];
  title?: string;
}
export const LayerColorPicker = ({ link, column, myLinks, title }: P) => {
  if(link.options.type === "table"){
    return null;
  }


  const rgba: RGBA = link.options.columns.find(c => c.name === column)?.colorArr ?? link.options.colorArr ?? [100,100,100] as any;
  return <ColorPicker 
    style={{ flex: "none" }}
    // label="Layer color"
    title={title}
    required={true}
    className="w-fit m-p5 text-gray-600"
    value={`rgba(${rgba})`} 
    onChange={(colorStr, colorArr) => {
      const thisLink = myLinks.find(l => l.id === link.id);
      if(thisLink && thisLink.options.type !== "table"){
        const opts = thisLink.options;
        thisLink.$update(
          { 
            options: { 
              colorArr,
              ...opts,
              columns: opts.columns.map(c => ({
                ...c,
                colorArr: c.name === column? colorArr : c.colorArr
              })),
            } 
          }, 
          { deepMerge: true }
        );
      }
    }} 
  />
}