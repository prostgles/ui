import { useEffectDeep } from "prostgles-client/dist/react-hooks";
import React, { useState } from "react";
import { isObject } from "../../../../commonTypes/publishUtils";
import Btn from "../../components/Btn";
import ErrorComponent from "../../components/ErrorComponent";
import { FlexCol, FlexRow } from "../../components/Flex";
import FormField from "../../components/FormField/FormField";
import Select from "../../components/Select/Select";
import { getKeys } from "../../utils";
import { CodeEditor } from "../CodeEditor/CodeEditor";
import type { GeoJSONFeature } from "../Map/DeckGLMap";
import { download } from "../W_SQL/W_SQL";
import { getOSMData } from "./OSM/getOSMData";
import { predefinedOsmQueries } from "./OSM/osmTypes";
import { mdiDownload, mdiPlus } from "@mdi/js";
import { OverpassQuery } from "./OSM/OverpassQuery";

type DataType = keyof typeof predefinedOsmQueries;

const getQuery = (
  type: DataType,
  subTypeValues: string[] | undefined,
  limit: number,
) => {
  const query = predefinedOsmQueries[type];
  let mainQuery =
    (isObject(query) ? `${query.nodeType}[${query.subTypeTag}]` : query) +
    `(\${bbox});`;
  if (
    subTypeValues?.length &&
    isObject(query) &&
    subTypeValues.length < query.subTypes.length
  ) {
    mainQuery =
      "(" +
      subTypeValues
        .map(
          (v) =>
            `${query.nodeType}[${[query.subTypeTag, v].map((s) => JSON.stringify(s)).join("=")}](\${bbox});`,
        )
        .join("") +
      ");";
  }
  return `[out:json];${mainQuery}out ${limit};`;
};

type MapOSMQueryOSMQueryProps = {
  bbox: string;
  onData: (features: GeoJSONFeature[], query: string) => void;
};
export const MapOSMQuery = ({ bbox, onData }: MapOSMQueryOSMQueryProps) => {
  const [query, setQuery] = useState("");
  const [dataType, setDataType] = useState<DataType>("roads");
  const defaultQuery = predefinedOsmQueries[dataType];
  const subTypes = isObject(defaultQuery) ? defaultQuery.subTypes : undefined;
  const [selectedSubTypes, setSelectedSubTypes] = useState<
    string[] | undefined
  >();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [features, setFeatures] = useState<GeoJSONFeature[]>([]);
  const [limit, setLimit] = useState(1e5);

  useEffectDeep(() => {
    setSelectedSubTypes(subTypes?.map((s) => s.value));
  }, [subTypes]);
  useEffectDeep(() => {
    setQuery(getQuery(dataType, selectedSubTypes, limit));
  }, [dataType, limit, selectedSubTypes]);

  const handleQueryChange = (value: string) => {
    setQuery(value);
  };

  const onSave = ([f, d] = [features, dataType]) => {
    download(JSON.stringify(f, null, 2), `${d}.geojson`, "text/json");
  };
  const onSearch = async (saveAsFile = false) => {
    setLoading(true);
    setError(null);

    try {
      const { data, features } = await getOSMData(query, bbox);
      setData(data);
      setFeatures(features);
      if (saveAsFile) {
        onSave([features, dataType]);
      } else {
        onData(features, query);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <FlexCol>
      <FlexRow>
        <Select
          label={"Data Type:"}
          options={getKeys(predefinedOsmQueries)}
          value={dataType}
          onChange={setDataType}
        />
        <FormField
          label={"Limit"}
          type="number"
          value={limit}
          style={{ width: "12ch" }}
          onChange={(e) => setLimit(e)}
        />
        {subTypes && (
          <Select
            label={"Subtypes"}
            multiSelect={true}
            fullOptions={subTypes.map((s) => ({
              key: s.value,
              subLabel: s.info,
            }))}
            value={selectedSubTypes}
            onChange={(values) => {
              setSelectedSubTypes(values);
            }}
          />
        )}
      </FlexRow>
      <OverpassQuery
        autoSave={true}
        query={query}
        onChange={handleQueryChange}
      />
      <FlexRow>
        <Btn
          iconPath={mdiPlus}
          loading={loading}
          variant="filled"
          color="action"
          onClick={() => onSearch()}
        >
          Add layer
        </Btn>

        <Btn
          iconPath={mdiDownload}
          loading={loading}
          variant="faded"
          color="action"
          onClick={() => onSearch(true)}
        >
          Save as GeoJSON
        </Btn>
      </FlexRow>
      {error && <ErrorComponent error={error} />}
      {data && (
        <>
          <CodeEditor
            style={{
              minWidth: "500px",
              minHeight: "500px",
            }}
            value={JSON.stringify(data, null, 2)}
            language="json"
          />
          <Btn color="action" variant="filled" onClick={() => onSave()}>
            Save as GeoJSON
          </Btn>
        </>
      )}
    </FlexCol>
  );
};
