import { mdiMagnify } from "@mdi/js";
import type { AnyObject } from "prostgles-types";
import { isDefined, isEmpty } from "prostgles-types";
import React, { useState } from "react";
import type { DetailedFilterBase } from "../../../../commonTypes/filterUtils";
import {
  GEO_FILTER_TYPES,
  getFinalFilter,
} from "../../../../commonTypes/filterUtils";
import Btn from "../../components/Btn";
import { ExpandSection } from "../../components/ExpandSection";
import { FlexRow } from "../../components/Flex";
import FormField from "../../components/FormField/FormField";
import { FormFieldDebounced } from "../../components/FormField/FormFieldDebounced";
import Popup from "../../components/Popup/Popup";
import Select from "../../components/Select/Select";
import type { DBSchemaTablesWJoins } from "../Dashboard/dashboardUtils";
import type { BaseFilterProps } from "./SmartFilter";
import type { SmartSearchOnChangeArgs } from "./SmartSearch/SmartSearch";
import { SmartSearch } from "./SmartSearch/SmartSearch";

export const GeoFilterTypes = GEO_FILTER_TYPES.map((f) => f.key);
export const getDefaultGeoFilter = (fieldName: string): DetailedFilterBase => ({
  fieldName,
  type: "$ST_DWithin",
  value: {
    distance: 1,
    lat: 51,
    lng: 0,
    name: "",
    unit: "km",
  } satisfies ST_DWithinFilterValue,
});

type ST_DWithinFilterValue = {
  lat: number;
  lng: number;
  unit: "km" | "m";
  name: string;

  /** Metres */
  distance: number;
};
export const GeoFilter = ({
  filter,
  db,
  tables,
  onChange,
}: BaseFilterProps & { filter: DetailedFilterBase }) => {
  const args: Partial<ST_DWithinFilterValue> = filter.value;

  const updateValue = (newArgs: typeof args) => {
    const newValue = {
      ...args,
      ...newArgs,
      unit: "km",
    };
    const disabled =
      !newValue.distance ||
      ![newValue.lat, newValue.lng, newValue.distance].every(
        (v, i, arr) => arr.length && Number.isFinite(v),
      );
    onChange({
      disabled,
      ...filter!,
      value: newValue,
    });
  };

  const geoTables = tables
    .map((t) => {
      const geoCols = t.columns.filter((c) => c.udt_name.startsWith("geo"));
      if (geoCols.length) {
        return {
          ...t,
          columns: geoCols,
        };
      }

      return undefined;
    })
    .filter(isDefined);
  const firstGeoTable = geoTables[0];

  const [open, setOpen] = useState<HTMLButtonElement>();
  const [refPoint, setRefPoint] = useState<{
    table?: DBSchemaTablesWJoins[number];
    row?: AnyObject;
  }>({ table: firstGeoTable });

  const setRow = async (
    args: (SmartSearchOnChangeArgs & { row: AnyObject }) | undefined,
  ) => {
    if (!args || !refPoint.table) return;
    const { row, colName, columnValue } = args;
    const firstGeoCol = refPoint.table.columns[0]; //.find(c => c.udt_name === "geography") ?? refPoint.table?.columns.find(c => c.udt_name === "geometry");
    if (!firstGeoCol) return;

    const select = {
      c: { $ST_Centroid: [firstGeoCol.name] },
    };
    const filter = getRowFilterFromPkey(
      row,
      tables.find((t) => t.name === refPoint.table!.name)!,
    );
    const rowRes = await db[refPoint.table.name!]?.findOne!(filter, { select });
    if (
      rowRes?.c &&
      Array.isArray(rowRes.c.coordinates) &&
      rowRes.c.coordinates.length === 2 &&
      rowRes.c.coordinates.every((v) => Number.isFinite(v))
    ) {
      const [lng, lat] = rowRes.c.coordinates;
      const name = (columnValue || `${lat} ${lng}`).toString();
      updateValue({
        lat,
        lng,
        name,
      });
      setOpen(undefined);
    }
  };

  return (
    <div className="flex-row p-p5 gap-p5 ai-center">
      <FormFieldDebounced
        placeholder="Km"
        style={{ padding: 0 }}
        inputProps={{
          // step: 1,
          style: { maxWidth: "7ch", minWidth: "7ch" },
        }}
        type="number"
        maxWidth={"16ch"}
        rightContentAlwaysShow={true}
        rightIcons={
          <div className="ai-center jc-center flex-col bg-color-2 f-1 h-full px-p5 noselect text-2">
            Km
          </div>
        }
        inputStyle={{ minHeight: "38px" }}
        value={args.distance}
        onChange={(distance) => updateValue({ distance: Number(distance) })}
      />
      {!!args.distance && (
        <>
          <div>of</div>
          <Btn
            variant="faded"
            onClick={(e) => {
              setOpen(open ? undefined : (e.target as any));
            }}
          >
            {args.name || `Select point`}
          </Btn>
          {open && (
            <Popup
              title={`${filter.fieldName} is within ${args.distance}${args.unit} of ${args.name || "..."}`}
              // rootStyle={{ position: "absolute" }}
              anchorEl={open}
              positioning="center"
              onClose={() => {
                setOpen(undefined);
              }}
              contentClassName="flex-col relative p-1 gap-1"
              // contentStyle={{
              //   minWidth: "800px",
              //   minHeight: "500px"
              // }}
            >
              <FlexRow>
                <FormField
                  type="number"
                  value={args.lat}
                  label={"Latitude"}
                  onChange={(lat) => updateValue({ lat, name: "" })}
                />
                <FormField
                  type="number"
                  value={args.lng}
                  label={"Longitude"}
                  onChange={(lng) => updateValue({ lng, name: "" })}
                />
              </FlexRow>

              <ExpandSection label="Find from data..." iconPath={mdiMagnify}>
                <Select
                  label="Table"
                  fullOptions={geoTables.map((t) => ({ key: t.name }))}
                  value={refPoint.table?.name}
                  labelAsValue={true}
                  onChange={(tableName) => {
                    setRefPoint({
                      table: geoTables.find((t) => t.name === tableName),
                    });
                  }}
                />
                {
                  refPoint.table && (
                    <SmartSearch
                      db={db}
                      tableName={refPoint.table.name}
                      tables={tables}
                      onChange={async (val) => {
                        if (!val) {
                          setRow(undefined);
                          return;
                        }
                        const { filter } = val;
                        const table = refPoint.table!;
                        const rowFilter = {
                          $and: filter.map((f) => getFinalFilter(f as any)),
                        };
                        const row = await db[table.name]?.findOne!(rowFilter);
                        setRow(!row ? undefined : { ...val, row });
                      }}
                    />
                  )
                  // <SmartTable
                  //   title=""
                  //   db={db}
                  //   tableName={refPoint?.table.name}
                  //   tables={tables}
                  //   onClickRow={async row => {
                  //     }
                  //     setRefPoint({ ...refPoint, row });

                  //   }}
                  // />
                }
                {/* <DeckGLMap 
            onGetFullExtent={async () => [[-180, -90], [180, 90]]} 
            options={{}} 
            initialState={{ latitude: 51, longitude: 0, basemap: { opacity: 1, tileURLs: [] } }} 
            onOptionsChange={console.log} 
          /> */}
              </ExpandSection>
            </Popup>
          )}
        </>
      )}
    </div>
  );
};

export const getRowFilterFromPkey = (
  row: AnyObject,
  table: DBSchemaTablesWJoins[number],
) => {
  const res = {};
  table.columns.map((c) => {
    if (c.is_pkey) {
      res[c.name] = row[c.name];
    }
  });

  return isEmpty(res) ? row : res;
};
