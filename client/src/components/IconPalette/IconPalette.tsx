import { mdiCancel, mdiChevronDown, mdiClose } from "@mdi/js";
import { usePromise } from "prostgles-client/dist/prostgles";
import React, { useMemo, useState } from "react";
import { isDefined } from "../../utils";
import Btn from "../Btn";
import { FlexCol, FlexRow, FlexRowWrap } from "../Flex";
import { FormFieldDebounced } from "../FormField/FormFieldDebounced";
import Popup from "../Popup/Popup";
import SearchList from "../SearchList/SearchList";
import { ScrollFade } from "../SearchList/ScrollFade";
import { Pagination } from "../Table/Pagination";

type P = {
  iconName: string | null | undefined;
  onChange: (newIcon: string | undefined | null) => void;
}
export const IconPalette = ({ iconName, onChange }: P) => {

  const iconList = usePromise(async () => {
    const iconsNames: string[] = await fetch("/icons/_meta.json").then(r => r.json());
    return iconsNames;
  }, []);
  const [searchTerm, setSearchTerm] = useState("");
  const iconStyle = {
    width: "50px",
    height: "50px",
  }
  const displayedItemsFull = useMemo(() => {
    if(!iconList) return [];
    return iconList.map(name => {
      //** Camel case to spaced */
      const label = name
        .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
        .replace(/_/g, " ");
      const rank = label.toLowerCase().indexOf(searchTerm.toLowerCase());
      if(rank === -1) return;
      return {
        name,
        label,
        rank,
        node: SearchList.getMatch({
          text: label,
          term: searchTerm,
          style: {
            fontSize: "14px",
          }
        }).node
      }
    })
    .filter(isDefined)
    .sort((a, b) => a.rank - b.rank)
  }, [iconList, searchTerm]);
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState(1);
  const displayedItems = useMemo(() => displayedItemsFull.slice((page - 1) * 50, page * 50), [page, displayedItemsFull]);

  return <>
    <FlexRow className="gap-p25">
      <Btn 
        variant="faded"
        children={!iconName? "Set icon..." : undefined}
        iconPath={!iconName? mdiChevronDown : undefined}
        iconPosition={!iconName? "right" : undefined}
        iconNode={!iconName? undefined : <img style={{ width: "24px", height: "24px" }} src={`/icons/${iconName}.svg`}></img>} 
        onClick={() => setOpen(true)}
      />
      {![undefined, null].includes(iconName as any) && <Btn iconPath={mdiClose} onClick={() => onChange(null) }/>}
    </FlexRow>
    {open && <Popup
      footerButtons={[
        {
          label: "Close",
          onClick: () => setOpen(false)
        }
      ]}
      contentClassName="p-0"
    >
      <FlexCol className="f-1 min-s-0 o-auto p-1">
        <FormFieldDebounced 
          label={"Search icons"}
          value={searchTerm}
          onChange={newTerm => {
            setSearchTerm(newTerm);
            setPage(1);
          }}
        />
        <div style={{ height: "1px", width: "100%", background: "var(--text-2)" }}></div>
        <ScrollFade className="text-color-1 min-s-0 o-auto flex-row-wrap gap-p25">
          {displayedItems.map(({ name, node }) => {
            return <FlexCol 
              style={{
                maxWidth: "55px",
              }}
              key={name}
              className="pointer" 
              onClick={() => {
                onChange(name);
                setOpen(false);
              }}
            >
              <img style={iconStyle} src={`/icons/${name}.svg`}></img>
              {node}
            </FlexCol>
          })}
        </ScrollFade>
        <Pagination
          className="mt-p25"
          totalRows={iconList?.length ?? 0}
          pageSize={50}
          page={page}
          onPageChange={newPage => setPage(newPage)}
        />
      </FlexCol>
    </Popup>}
  </> 
}