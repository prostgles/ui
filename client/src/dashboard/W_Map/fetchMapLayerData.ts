import * as d3 from "d3";
import type { AnyObject, SelectParams } from "prostgles-types";
import { pickKeys } from "prostgles-types";
import { getIcon } from "../../components/SvgIcon";
import type {
  Extent,
  GeoJSONFeature,
  GeoJsonLayerProps,
} from "../Map/DeckGLMap";
import { getOSMData } from "./OSM/getOSMData";
import type W_Map from "./W_Map";
import type { W_MapState } from "./W_Map";
import { MAP_SELECT_COLUMNS, getMapSelect, getSQLData } from "./getMapData";
import { getMapFeatureStyle } from "./getMapFeatureStyle";

export const DEFAULT_GET_COLOR: Pick<
  GeoJsonLayerProps,
  "getFillColor" | "getLineColor"
> = {
  getLineColor: (f: GeoJSONFeature) =>
    f.geometry.type === "Polygon" ? [200, 0, 80, 55] : [0, 129, 167, 255],
  getFillColor: (f: GeoJSONFeature) =>
    f.geometry.type === "Polygon" ? [200, 0, 80, 255] : [0, 129, 167, 255],
};

export const fetchMapLayerData = async function (this: W_Map, dataAge: number) {
  const {
    prgl: { db },
    layerQueries = [],
    tables,
  } = this.props;
  const { w } = this.d;
  if (!w) return;

  const ext4326: Extent = (w.options.extent as Extent | undefined) || [
    -180, -90, 180, 90,
  ];

  let result: W_MapState = {} as any,
    error;
  const AGG_LIMIT = 100000;

  let { bytesPerSec } = this.state;
  if (this.state.loadingLayers) {
    this.loadAgain = true;
    return;
  }

  for await (const l of this.props.myLinks) {
    const opts = l.options;
    if (opts.type === "map" && opts.mapIcons) {
      if (opts.mapIcons.type === "fixed") {
        await getIcon(opts.mapIcons.iconPath);
      } else {
        for await (const c of opts.mapIcons.conditions) {
          await getIcon(c.iconPath);
        }
      }
    }
  }

  if (w.options.extent) {
    try {
      this.setState({ loadingLayers: true });

      this.lastDataRequest = Date.now();

      /** Remove subscriptions that are not used anymore */
      this.layerSubs
        .filter(
          (s) =>
            !layerQueries.find(
              (l) => "tableName" in l && l.tableName === s.tableName,
            ),
        )
        .map((s) => {
          s.sub.unsubscribe();
        });

      const layers: GeoJsonLayerProps[] = [];
      await Promise.all(
        layerQueries
          .filter((q) => !q.disabled)
          .map(async (q, i) => {
            let rows: AnyObject[] | undefined,
              aggs: { c: string; l: any; radius: number }[] | undefined,
              _tableName,
              _geomColumn,
              dataSignature = "",
              tableFilterWOExtent: AnyObject = {},
              opts: SelectParams = {};

            let willAggregate = false;

            if (q.type === "osm") {
              const [b, a, b1, a1] = w.options.extent ?? [];
              const osmBbox = w.options.extent ? [a, b, a1, b1].join(",") : "";
              const { features } =
                !osmBbox ?
                  { features: [] }
                : await getOSMData(q.query, osmBbox);
              layers.push({
                dataSignature,
                id: "osm" + Date.now(),
                features,
                pickable: true,
                stroked: true,
                filled: true,
                ...DEFAULT_GET_COLOR,
              });
            } else if ("tableName" in q) {
              const { tableName, geomColumn } = { ...q };
              const { ...f } = this.getFilter(q, ext4326);

              _tableName = tableName;
              _geomColumn = geomColumn;

              const columns = tables.find((t) => t.name === tableName)?.columns;
              if (!columns) {
                this.setState({
                  error: "Could not find columns for table: " + tableName,
                });
                return;
              }

              const tableHandler = db[tableName];
              if (
                !tableHandler?.find ||
                !tableHandler.findOne ||
                !tableHandler.size
              ) {
                throw `db.${tableName} handler is missing one of the required permissions: find, findOne, size`;
              }

              const zoom = w.options.zoom || 1;
              tableFilterWOExtent = f.finalFilterWOextent;

              const subFilter = tableFilterWOExtent;
              const subFilterStr = JSON.stringify(subFilter);
              if (
                tableHandler.subscribe &&
                w.options.refresh?.type === "Realtime" &&
                !this.layerSubs.find(
                  (s) => s.filter === subFilterStr && s.tableName === tableName,
                )
              ) {
                try {
                  const sub = await tableHandler.subscribe(
                    subFilter,
                    {
                      limit: 2,
                      throttle: (w.options.refresh.throttleSeconds || 0) * 1000,
                    },
                    () => {
                      this.setLayerData(Date.now());
                    },
                  );
                  this.layerSubs.push({
                    tableName,
                    filter: subFilterStr,
                    sub,
                  });
                } catch (e: any) {
                  console.error(e);
                  alert("Could not subscribe. Check logs ");
                }
              }

              /** Get client download speed */
              const downloadStart = Date.now();

              const select = getMapSelect(q, columns, this.props.myLinks);
              const selectGeoJson = { select: pickKeys(select, ["l"]) };
              const oneRow = await tableHandler.findOne(
                f.finalFilter,
                selectGeoJson,
              );
              const seconds = (Date.now() - downloadStart) / 1000;
              bytesPerSec = (JSON.stringify(oneRow || {}).length * 4) / seconds;
              opts = { select: select as any, limit: AGG_LIMIT };

              if (!oneRow || !this.ref) {
                layers.push({
                  dataSignature,
                  id: "tbl" + Date.now(),
                  features: [],
                  pickable: true,
                  stroked: true,
                  filled: true,
                  ...DEFAULT_GET_COLOR,
                });
                return;
              }

              const xDelta = Math.abs(ext4326[0] - ext4326[2]);
              const yDelta = Math.abs(ext4326[1] - ext4326[3]);
              const minDelta = Math.min(xDelta, yDelta);

              /** Simplify Polygon and LineString shapes */
              if (!oneRow.l?.type.endsWith("Point")) {
                // && (oneRow?.c?.coordinates || []).flat().flat().flat().length > 30){
                const scale =
                  zoom > 7 ?
                    d3
                      .scaleLinear()
                      .range([0, 0.005])
                      .domain([9, 7])
                      .clamp(true)
                  : d3
                      .scaleLinear()
                      .range([0.005, 0.05])
                      .domain([7, 1])
                      .clamp(true);
                const size = scale(zoom);
                if (size > 0) {
                  opts = {
                    select: {
                      ...pickKeys(select, ["i"]),
                      [MAP_SELECT_COLUMNS.geoJson]: {
                        $ST_Simplify: [geomColumn, size],
                      },
                    } as any,
                    limit: AGG_LIMIT,
                  };
                }
              }

              const { signature, cachedLayer } = this.getDataSignature(
                { filter: f.finalFilter, ...opts },
                dataAge,
                q,
                w.options.aggregationMode,
              );
              dataSignature = signature;
              if (cachedLayer) {
                layers.push(cachedLayer);
                return;
              }

              if (oneRow.l?.type === "Point") {
                const { aggregationMode } = this.d.w?.options ?? {};
                if (aggregationMode?.type === "limit") {
                  const count = parseInt(
                    (await tableHandler.count?.(f.finalFilter)) as any,
                  );
                  willAggregate =
                    Number.isFinite(count) &&
                    count > (aggregationMode.limit || 1000);
                } else {
                  // const count = await db[tableName].count(f.finalFilter);
                  const size = await tableHandler.size(
                    f.finalFilter,
                    selectGeoJson,
                  );
                  const actualWait = +size / 1000 / bytesPerSec;
                  willAggregate = actualWait > (aggregationMode?.wait ?? 2);
                }
              }

              if (willAggregate) {
                const radiusRangeScale = d3
                  .scaleLinear()
                  .range([20, 250])
                  .domain([0.001, 0.1]);
                const scale = d3
                  .scaleLinear()
                  .range([0.07, 0.0005])
                  .domain([0.886, 0.007166]);
                /** TODO: fix point bad agg cluster positioning at low zoom  */
                // const scale = d3.scaleLinear().range([0.07, 0.0005]).domain([0.2, 0.007166]).clamp(true);
                const size = scale(minDelta);
                const opts = {
                  select: {
                    c: { $countAll: [] },
                    [MAP_SELECT_COLUMNS.geoJson]: {
                      $ST_SnapToGrid: [geomColumn, size],
                    },
                  },
                  limit: AGG_LIMIT,
                } as const;

                const aggRows = (await tableHandler.find(
                  f.finalFilter,
                  opts,
                )) as Record<keyof (typeof opts)["select"], any>[];
                let minCount, maxCount;
                aggRows.forEach(({ c }) => {
                  minCount = Math.min(minCount ?? +c, +c);
                  maxCount = Math.max(maxCount ?? +c, +c);
                });
                const maxRange = radiusRangeScale(minDelta);
                const radiusScale = d3
                  .scaleLinear()
                  .range([1, maxRange])
                  .domain([minCount, maxCount]);

                aggs = aggRows.map((a) => ({
                  ...a,
                  radius: radiusScale(+a.c),
                }));
              } else {
                const scale = d3
                  .scaleLinear()
                  .range([1, 10, 80, 100])
                  .domain([20, 14, 10, 1])
                  .clamp(true);

                rows = (await tableHandler.find(f.finalFilter, opts)) as any;

                const radius = scale(zoom);
                rows = rows?.map((r) => ({ ...r, type: "table", radius }));
              }
              if (aggs)
                aggs = aggs.filter(
                  (r) => r[MAP_SELECT_COLUMNS.geoJson]?.coordinates?.length,
                );
              if (rows)
                rows = rows.filter(
                  (r) => r[MAP_SELECT_COLUMNS.geoJson]?.coordinates?.length,
                );
            } else if ("sql" in q) {
              if (!db.sql) {
                console.error("Not enough privileges to run query");
                alert(
                  "Could not show data: sql privilege not allowed for current user",
                );
                return;
              }
              const { sql } = q;
              const lsig = this.getDataSignature({ sql }, dataAge, q, []);

              dataSignature = lsig.signature;
              if (lsig.cachedLayer) {
                layers.push(lsig.cachedLayer);
                return;
              }

              rows = await getSQLData(q, db, AGG_LIMIT);
              rows = rows.map((r) => ({ ...r, type: "sql" }));
            }

            let data = rows || aggs || ([] as any);
            data = data.filter((r) => r[MAP_SELECT_COLUMNS.geoJson]);
            const badRow = data.find(
              (r) => typeof r[MAP_SELECT_COLUMNS.geoJson] !== "object",
            );
            if (badRow) {
              console.error(
                "Bad GeoJSON data. Expecting type object but got -> " +
                  typeof badRow.l,
                badRow,
              );
              data = [];
            }

            const { fillColor, lineColor } = q;
            const layerColor = lineColor;

            layers.push({
              id: q._id + Date.now(),
              dataSignature,
              features: data.map((r) => ({
                type: "Feature",
                geometry: r[MAP_SELECT_COLUMNS.geoJson],
                properties: {
                  radius: +r.radius || 1,
                  ...r,
                  layer: q,
                  tableName: _tableName,
                  geomColumn: _geomColumn,
                },
              })),
              pickable: true,
              stroked: true,
              filled: true,
              elevation: q.elevation,
              ...getMapFeatureStyle(
                q,
                this.state.clickedItem,
                this.props.myLinks,
              ),
              getLineWidth: (f) => 1211,
              layerColor,
              lineWidth: 1222,
            });
          }),
      );

      result = { layers } as any;
    } catch (err) {
      error = err;
    }
  }

  if (!result.layers) {
    delete result.layers;
  }

  if (this.loadAgain) {
    this.loadAgain = false;
    setTimeout(() => this.setLayerData(this.state.dataAge), 0);
  }

  this.setState({
    ...result,
    loadingLayers: false,
    error,
    bytesPerSec,
    dataAge,
  });
};
