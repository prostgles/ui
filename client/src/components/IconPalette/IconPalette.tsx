import { mdiChevronDown, mdiClose } from "@mdi/js";
import { usePromise } from "prostgles-client/dist/prostgles";
import React, { useMemo, useState } from "react";
import { isDefined } from "../../utils";
import Btn from "../Btn";
import type { BtnProps } from "../Btn";
import { FlexCol, FlexRow } from "../Flex";
import { FormFieldDebounced } from "../FormField/FormFieldDebounced";
import Popup from "../Popup/Popup";
import { ScrollFade } from "../SearchList/ScrollFade";
import { Pagination } from "../Table/Pagination";
import { SvgIcon } from "../SvgIcon";

type P = {
  iconName: string | null | undefined;
  onChange: (newIcon: string | undefined | null) => void;
  label?: BtnProps["label"];
};
export const IconPalette = ({ iconName, onChange, label }: P) => {
  const iconList = usePromise(async () => {
    const iconsNames: string[] = await fetch("/icons/_meta.json").then((r) =>
      r.json(),
    );
    return iconsNames;
  }, []);
  const [searchTerm, setSearchTerm] = useState("");
  const iconSize = 55;
  const iconStyle = {
    width: `${iconSize}px`,
    height: `${iconSize}px`,
  };
  const displayedItemsFull = useMemo(() => {
    if (!iconList) return [];
    return iconList
      .map((name) => {
        //** Camel case to spaced */
        const label = name
          .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
          .replace(/_/g, " ");
        const rank = label.toLowerCase().indexOf(searchTerm.toLowerCase());
        if (rank === -1) return;
        return {
          name,
          label,
          rank,
          node: (
            <span>
              {label.slice(0, rank)}
              <strong>{label.slice(rank, rank + searchTerm.length)}</strong>
              {label.slice(rank + searchTerm.length)}
            </span>
          ),
        };
      })
      .filter(isDefined)
      .sort((a, b) => a.rank - b.rank);
  }, [iconList, searchTerm]);
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState(1);
  const displayedItems = useMemo(
    () => displayedItemsFull.slice((page - 1) * 50, page * 50),
    [page, displayedItemsFull],
  );

  return (
    <>
      <FlexRow className="gap-p25">
        <Btn
          label={label}
          variant="faded"
          children={!iconName ? "Set icon..." : undefined}
          iconPath={!iconName ? mdiChevronDown : undefined}
          iconPosition={!iconName ? "right" : undefined}
          iconNode={!iconName ? undefined : <SvgIcon icon={iconName} />}
          onClick={() => setOpen(true)}
        />
        {![undefined, null].includes(iconName as any) && (
          <Btn
            className="as-end"
            iconPath={mdiClose}
            onClick={() => onChange(null)}
          />
        )}
      </FlexRow>
      {open && (
        <Popup
          footerButtons={[
            {
              label: "Close",
              onClick: () => setOpen(false),
            },
          ]}
          rootStyle={{
            flex: 1,
          }}
          rootChildClassname="f-1"
          contentClassName="p-0"
          positioning="center"
          persistInitialSize={true}
          title="Chose icon"
          onClose={() => setOpen(false)}
        >
          <FlexCol
            className="f-1 min-s-0 o-auto p-1"
            style={{
              maxWidth: "min(99vw, 1200px)",
            }}
          >
            <FormFieldDebounced
              label={"Search icons"}
              value={searchTerm}
              onChange={(newTerm) => {
                setSearchTerm(newTerm);
                setPage(1);
              }}
            />
            <div
              style={{
                height: "1px",
                width: "100%",
                background: "var(--text-2)",
              }}
            ></div>
            <ScrollFade className="text-color-1 min-s-0 o-auto flex-row-wrap gap-1">
              {displayedItems.map(({ name, node }) => {
                return (
                  <FlexCol
                    style={{
                      maxWidth: `${iconSize + 45}px`,
                    }}
                    key={name}
                    className="pointer ai-center"
                    onClick={() => {
                      onChange(name);
                      setOpen(false);
                    }}
                  >
                    <SvgIcon icon={name} size={iconSize} />
                    <div className=" text-ellipsis">{node}</div>
                  </FlexCol>
                );
              })}
            </ScrollFade>
            <Pagination
              className="mt-p25"
              totalRows={displayedItemsFull.length}
              pageSize={50}
              page={page}
              onPageChange={(newPage) => setPage(newPage)}
            />
          </FlexCol>
        </Popup>
      )}
    </>
  );
};
