import { mdiCalendar, mdiCrosshairsGps, mdiFormatText } from "@mdi/js";
import { _PG_date } from "prostgles-types";
import React from "react";
import Btn from "../../../components/Btn";
import PopupMenu from "../../../components/PopupMenu";
import type { SmartFormFieldProps } from "./SmartFormField";

type P = Omit<SmartFormFieldProps, "onChange"> & {
  showDateInput: {
    value: boolean;
    onChange: (newValue: boolean) => void;
  };
  onChange: (newValue: any) => void;
};
export const getSmartFormFieldRightButtons = ({
  column,
  onChange,
  showDateInput,
}: P) => {
  const isGeoData =
    column.udt_name === "geometry" || column.udt_name === "geography";

  if (_PG_date.some((v) => v === column.udt_name)) {
    return (
      <Btn
        title={showDateInput.value ? "Edit as text" : "Edit with picker"}
        iconPath={showDateInput.value ? mdiFormatText : mdiCalendar}
        className="h-full"
        // color={showDateInput? "action" : undefined}
        onClick={() => showDateInput.onChange(!showDateInput.value)}
        size="small"
      />
    );
  } else if (isGeoData) {
    return (
      <>
        {/* <PopupMenu 
        button={
          <Btn iconPath={mdiMap} />
        }
        title="Edit"
        showFullscreenToggle={{ defaultValue: true }}
        render={onClose => <div className="f-1 flex-row h-full w-full relative">
          <DeckGLMap
            geoJsonLayers={[]}
            onGetFullExtent={() => {
              return [[1,1], [1,1]];
            }}
            options={{}}
            tileURLs={DEFAULT_TILE_URLS}
            edit={{ 
              dbMethods: methods, 
              dbProject: db, 
              dbTables: tables,
              feature: value as any,
              onStartEdit: () => {},
              onInsertOrUpdate: () => {
                onClose();
              }
            }}
          />
        </div>}
      /> */}
        <PopupMenu
          style={{
            height: "100%",
            borderRight: `1px solid var(--gray-300)`,
          }}
          button={
            <Btn
              title="Use my current location"
              iconPath={mdiCrosshairsGps}
              className={`h-full rounded-${column.is_nullable ? 0 : "r"}`}
              onClick={() => showDateInput.onChange(!showDateInput.value)}
              size="small"
            />
          }
          content={
            <p>You will have to allow your browser to use your location data</p>
          }
          footerButtons={[
            {
              color: "action",
              label: "OK",
              onClick: () => {
                try {
                  navigator.geolocation.getCurrentPosition((pos) => {
                    const lat = pos.coords.latitude;
                    const lng = pos.coords.longitude;
                    if ((lat as any) === null) {
                      alert("GPS not activated!");
                    } else {
                      onChange({
                        $ST_GeomFromEWKT: [`SRID=4326;POINT(${lng} ${lat})`],
                      });
                    }
                  });
                } catch (e: any) {
                  alert("Something went wrong: " + e.toString());
                }
              },
            },
            {
              label: "No thanks",
              onClickClose: true,
            },
          ]}
        />
      </>
    );
  }

  return null;
};
