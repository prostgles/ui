import type { AnyObject } from "prostgles-types";
import { asName, getKeys, isDefined } from "prostgles-types";
import { getFileText } from "../W_SQL/W_SQLMenu";
import type FileImporter from "./FileImporter";
import { getRowsPerBatch } from "./FileImporter";
import type { Col } from "./parseCSVFile";
import { parseCSVFile } from "./parseCSVFile";
import type { GeoJSONFeature } from "../Map/DeckGLMap";

export const setFile = function (this: FileImporter, file: File) {
  const lowerName = file.name.toLowerCase();
  const type =
    lowerName.endsWith(".geojson") ? "geojson"
    : lowerName.endsWith(".json") ? "json"
    : "csv";
  const { headerType, customHeaders, streamColumnDataType, streamBatchMb } =
    this.state;
  this.setState({ loadingFileName: file.name, importing: undefined });
  const maxSize = 1e8 / 2; // 50Mb

  if (type.endsWith("json")) {
    parseJSONFile(file)
      .then(({ rows, cols, srid, type, rowsPerBatch }) => {
        this.setState({
          loadingFileName: undefined,
          selectedFile: {
            file,
            type,
            srid,
            header: false,
            preview: {
              allRows: rows,
              rowsPerBatch,
              cols: cols.map((col) => ({
                ...col,
                label: col.key,
                subLabel: col.dataType,
                sortable: false,
                //dataType: "text",// key === "geometry"? "geometry" : key === "feature"? "jsonb" : "text"
              })),
              rows: rows.slice(0, 50).map((_r) => {
                const r = { ..._r };
                // r.geometry = JSON.stringify(r.geometry).slice(0, 250) + "...";
                return r;
              }),
            },
          },
        });
      })
      .catch((err) => {
        this.setState({ error: err });
      });

    /** csv */
  } else {
    const { config } = this.state;
    try {
      const hasCustHeaders = !(headerType === "First row") && customHeaders;
      parseCSVFile(file, { ...config, header: !hasCustHeaders })
        .then(({ rows, cols: _cols, header }) => {
          const cols =
            !hasCustHeaders ? _cols : (
              customHeaders.split(",").map((k) => {
                const key = k.trim();
                return { key, dataType: "text", escapedName: asName(key) };
              })
            );
          this.setState({
            loadingFileName: undefined,
            selectedFile: {
              file,
              type: "csv",
              header,
              preview: {
                allRows: rows,
                cols: cols.map((col) => ({
                  ...col,
                  label: col.key,
                  subLabel: col.dataType,
                  sortable: false,
                  //dataType: "text",// key === "geometry"? "geometry" : key === "feature"? "jsonb" : "text"
                })),
                rows: rows.slice(0, 50).map((_r) => {
                  const r = { ..._r };
                  // r.geometry = JSON.stringify(r.geometry).slice(0, 250) + "...";
                  return r;
                }),
              },
            },
          });
        })
        .catch((err) => {
          this.setState({ error: err });
        });
    } catch (e) {
      console.error(e);
    }
  }
};

async function parseJSONFile(file: File): Promise<{
  type: "json" | "geojson";
  rows: AnyObject[];
  cols: Col[];
  srid?: string;

  /**
   * Must send less data than maxHttpBufferSize: (1e8 which is 100Mb)
   * 1 char = 4 bytes
   */
  rowsPerBatch: number;
}> {
  let type: "json" | "geojson" = "json";
  const txt = await getFileText(file);
  const obj = JSON.parse(txt);
  const actualBytesPerChar = txt.length / file.size;
  let rows: AnyObject[] = [];
  let srid;
  let _cols: Record<string, "text" | "numeric" | "geometry"> = {};
  let maxCharsPerRow = 0;
  const setCol = (row) => {
    const getType = (v) => (typeof v === "number" ? "numeric" : "text");
    Object.keys(row).map((k) => {
      const actualType = getType(row[k]);
      const type = _cols[k];
      if (!type || (type === "numeric" && actualType === "text")) {
        _cols[k] = actualType;
      }
    });
  };
  const getGeoJSONFeatures = (): undefined | GeoJSONFeature[] => {
    if (
      obj.type === "FeatureCollection" &&
      obj.features &&
      Array.isArray(obj.features)
    ) {
      return obj.features;
    } else if (
      Array.isArray(obj) &&
      obj.length &&
      obj[0].type === "Feature" &&
      typeof obj[0].geometry?.type === "string" &&
      Array.isArray(obj[0].geometry.coordinates)
    ) {
      return obj;
    }
  };

  const geoJSONFeatures = getGeoJSONFeatures();
  if (geoJSONFeatures) {
    type = "geojson";
    _cols = { geometry: "geometry" };
    let hasID = false;
    geoJSONFeatures.map((f: GeoJSON.Feature, i) => {
      if ((f.type as any) !== "Feature") {
        console.warn(
          `Could not import feature number ${i}. Feature.type is not "Feature"`,
          f,
        );
      } else {
        let row = f.properties;
        hasID = hasID || f.id !== undefined;
        if (hasID) {
          row = { ...row, dI: f.id };
        }
        setCol(row);
      }
    });
    const colKeys = getKeys(_cols);
    rows = geoJSONFeatures
      .map((f: GeoJSON.Feature, i) => {
        if ((f.type as any) !== "Feature") {
          console.warn(
            `Could not import feature number ${i}. Feature.type is not "Feature"`,
            f,
          );
        } else {
          srid =
            srid ||
            (f as any).geometry?.crs?.type?.name?.properties?.name ||
            "EPSG:4326";

          const row: Record<string, any> = {};
          colKeys.map((k) => {
            if (k === "id" && hasID) {
              row[k] = f.id ?? null;
            } else if (k === "geometry") {
              // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
              row[k] = f.geometry ?? null;
            } else if (f.properties) {
              row[k] = f.properties[k] ?? null;
            }
          });

          maxCharsPerRow = Math.max(maxCharsPerRow, JSON.stringify(row).length);
          return row;
        }
      })
      .filter(isDefined);
  } else if (Array.isArray(obj)) {
    obj.forEach((row) => {
      setCol(row);
    });
    const colKeys = Object.keys(_cols);
    rows = obj.map((row) => {
      colKeys.map((k) => {
        row[k] = row[k] ?? null;
      });

      maxCharsPerRow = Math.max(maxCharsPerRow, JSON.stringify(row).length);
      return row;
    });
  }

  return {
    type,
    rows,
    srid,
    cols: Object.entries(_cols).map(([key, dataType]) => ({
      key,
      escapedName: asName(key),
      dataType,
    })),
    rowsPerBatch: getRowsPerBatch(maxCharsPerRow, actualBytesPerChar),
  };
}
