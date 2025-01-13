import { mdiDelete, mdiMap, mdiPlus, mdiSearchWeb } from "@mdi/js";
import React, { useCallback, useState } from "react";
import Btn from "../../components/Btn";
import ButtonGroup from "../../components/ButtonGroup";
import Chip from "../../components/Chip";
import { FlexCol } from "../../components/Flex";
import FormField from "../../components/FormField/FormField";
import PopupMenu from "../../components/PopupMenu";
import SmartTable from "../SmartTable";
import { MAP_PROJECTIONS } from "./W_MapMenu";
import type { WindowData } from "../Dashboard/dashboardUtils";
import type { SyncDataItem } from "prostgles-client/dist/SyncedTable/SyncedTable";
import type { Prgl } from "../../App";
import { DEFAULT_TILE_URLS } from "../Map/mapUtils";
import { Label } from "../../components/Label";
import { InfoRow } from "../../components/InfoRow";
import { isEqual, isDefined } from "prostgles-types";

type P = {
  w: SyncDataItem<Required<WindowData<"map">>, true>;
  className?: string;
  prgl: Prgl;
  asPopup?: {
    prgl: Prgl;
  };
};
export const MapBasemapOptions = ({ w, prgl, className, asPopup }: P) => {
  const { tables } = prgl;
  const mediaTable = tables.find((t) => t.info.isFileTable);
  const [localOptions, setLocalOptions] = useState(w.options);
  const [newTileUrl, setNewTileUrl] = useState("");
  const {
    tileURLs,
    projection = "mercator",
    basemapImage,
    tileAttribution,
    tileSize,
  } = asPopup ? localOptions : w.options;
  const tileURLsOrDefaults = tileURLs?.length ? tileURLs : DEFAULT_TILE_URLS;
  const updateOptions = useCallback(
    (options: Partial<(typeof w)["options"]>) => {
      setLocalOptions({ ...localOptions, ...options });
      if (asPopup) return;
      w.$update({ options }, { deepMerge: true });
    },
    [w, localOptions, asPopup],
  );
  const setBaseImageURL = useCallback(
    async (url) => {
      const setBounds = (height = 100, width = 100) => {
        updateOptions({ basemapImage: { url, bounds: [0, 0, width, height] } });
      };

      try {
        const img = new Image();
        img.onload = function () {
          const height = img.height;
          const width = img.width;
          setBounds(height, width);
        };
        img.onerror = (e) => {
          console.error(e);
          setBounds();
        };
        img.src = url;
      } catch (e) {
        setBounds();
        console.error(e);
      }
    },
    [updateOptions],
  );

  const content = (
    <FlexCol className={className}>
      <ButtonGroup
        label={{ label: "Projection", variant: "normal" }}
        options={MAP_PROJECTIONS}
        value={projection}
        onChange={(projection) => {
          updateOptions({ projection });
        }}
      />
      {projection !== "mercator" ?
        <>
          <FormField
            type="text"
            label="Basemap Image URL"
            autoComplete="off"
            asColumn={true}
            value={basemapImage?.url}
            onChange={setBaseImageURL}
            rightIcons={
              mediaTable && (
                <PopupMenu
                  button={
                    <Btn
                      iconPath={mdiSearchWeb}
                      title="From data"
                      size={"small"}
                    />
                  }
                  render={(pClose) => {
                    return (
                      <SmartTable
                        theme={prgl.theme}
                        title="Click row to select"
                        db={prgl.db}
                        tableName={mediaTable.name}
                        tables={tables}
                        methods={prgl.methods}
                        filter={[
                          {
                            fieldName: "content_type",
                            type: "$ilike",
                            value: "%image%",
                            minimised: true,
                          },
                        ]}
                        onClickRow={(row) => {
                          if (row) {
                            setBaseImageURL(row.url);
                            pClose();
                          }
                        }}
                      />
                    );
                  }}
                />
              )
            }
          />
        </>
      : <>
          <FormField
            type="text"
            label="Attribution"
            autoComplete="off"
            asColumn={true}
            value={tileAttribution?.title}
            onChange={(title) => {
              updateOptions({
                tileAttribution: {
                  url: "",
                  ...tileAttribution,
                  title,
                },
              });
            }}
          />
          <FormField
            type="url"
            label="Attribution URL"
            autoComplete="off"
            asColumn={true}
            value={tileAttribution?.url}
            onChange={(url) => {
              updateOptions({
                tileAttribution: {
                  title: "",
                  ...tileAttribution,
                  url,
                },
              });
            }}
          />
          <Label label="Tile URLs" variant="normal" />
          {tileURLsOrDefaults.map((turl, i) => (
            <div key={i} className="flex-row ai-center py-p5 o-auto">
              <Btn
                iconPath={mdiDelete}
                color="danger"
                onClick={() => {
                  updateOptions({
                    tileURLs: tileURLsOrDefaults.filter((t) => t !== turl),
                  });
                }}
              />
              <Chip variant="naked" value={turl} />
            </div>
          ))}
          <InfoRow color="info">Delete all tiles to restore default</InfoRow>
          <FormField
            label={"New tile URL"}
            type="text"
            asTextArea={true}
            value={newTileUrl}
            onChange={setNewTileUrl}
            rightContentAlwaysShow={true}
            rightIcons={
              <Btn
                title="Add new tile url"
                color="action"
                iconPath={mdiPlus}
                onClick={() => {
                  const urls = Array.from(
                    new Set([...tileURLsOrDefaults, newTileUrl]),
                  ).filter(isDefined);
                  updateOptions({ tileURLs: urls });
                }}
              />
            }
          />
          <FormField
            label="Tile size"
            asColumn={true}
            value={tileSize || 256}
            options={[16, 32, 64, 128, 256, 512, 1024]}
            onChange={(tileSize) => {
              updateOptions({ tileSize });
            }}
          />
        </>
      }
    </FlexCol>
  );

  if (!asPopup) {
    return content;
  }

  return (
    <PopupMenu
      title="Basemap config"
      className={className}
      clickCatchStyle={{ opacity: 0.5 }}
      onClickClose={false}
      positioning="center"
      contentClassName="p-1"
      button={
        <Btn iconPath={mdiMap} color="action" variant="faded">
          Basemap config
        </Btn>
      }
      footerButtons={[
        {
          label: "Cancel",
          onClickClose: true,
        },
        {
          label: "Update",
          variant: "filled",
          color: "action",
          disabledInfo:
            isEqual(w.options, localOptions) ? "Nothing to update" : undefined,
          onClickPromise: async () => {
            await w.$update({ options: localOptions }, { deepMerge: true });
          },
        },
      ]}
    >
      {content}
    </PopupMenu>
  );
};
