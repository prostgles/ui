import { mdiPencil } from "@mdi/js";
import { useEffectDeep } from "prostgles-client/dist/react-hooks";
import React, { useState } from "react";
import Btn from "../../../components/Btn";
import { FlexCol, FlexRow } from "../../../components/Flex";
import Loading from "../../../components/Loading";
import Popup from "../../../components/Popup/Popup";
import SearchList from "../../../components/SearchList/SearchList";
import { SwitchToggle } from "../../../components/SwitchToggle";
import type { CommonWindowProps } from "../../Dashboard/Dashboard";
import type { JoinV2 } from "../../Dashboard/dashboardUtils";
import { getJoinTree, type JoinTree } from "./getJoinTree";
import { JoinPathItem, getJoinPathConditionStr } from "./JoinPathItem";

type P = {
  tableName: string;
  tables: CommonWindowProps["tables"];
  onSelect: (joinPath: JoinV2[]) => void;
  variant?: "hover";
  className?: string;
  style?: React.CSSProperties;
};

export const JoinPathSelector = (props: P) => {
  const { tables, onSelect, className = "", style = {}, tableName } = props;
  const [s, setS] = useState<{
    jpath: JoinTree[];
    joins?: JoinTree[];
    currentJoin?: JoinTree;
  }>({ jpath: [] });

  useEffectDeep(() => {
    if (s.joins) return;
    const joins = getJoinTree({ tables, tableName });
    setS({ jpath: s.jpath, joins });
  }, [tables, tableName, s]);

  const { joins } = s;
  const [joinPath, setJoinPath] = useState<JoinV2[]>();
  const currentTableName = joinPath?.at(-1)?.tableName ?? tableName;
  const table = tables.find((t) => t.name === currentTableName);
  if (!table) return null;
  if (!joins) return <Loading />;

  const { joinsV2 } = table;
  return (
    <FlexCol className={`JoinPathSelectorV3 ${className}`} style={style}>
      <FlexRow className="p-1 bb b-color o-auto">
        <JoinPathItem
          tableName={tableName}
          prevTableName={undefined}
          on={[]}
          onChange={() => {}}
          tables={tables}
        />
        {joinPath?.map((j, i) => (
          <JoinPathItem
            key={JSON.stringify(i)}
            tables={tables}
            prevTableName={joinPath[i - 1]?.tableName ?? tableName}
            {...j}
            onChange={(newJoin) => {
              const newJoinPath = joinPath.map((j, ii) =>
                ii === i ? newJoin : j,
              );
              setJoinPath(newJoinPath);
              onSelect(newJoinPath);
            }}
          />
        ))}
      </FlexRow>
      <SearchList
        items={joinsV2.map((j) => ({
          key: j.tableName,
          label: j.tableName,
          subLabel: getJoinPathConditionStr(j),
          onPress: () => {
            const newJoinPath = [...(joinPath || []), j];
            setJoinPath(newJoinPath);
            onSelect(newJoinPath);
          },
        }))}
      />
    </FlexCol>
  );
};

export const getHasJoins = (
  tableName: string,
  tables: CommonWindowProps["tables"],
) => {
  return Boolean(
    tables.find(
      (t) =>
        (t.name === tableName && t.columns.find((c) => c.references)) ||
        (t.name !== tableName &&
          t.columns.find((c) =>
            c.references?.some((r) => r.ftable === tableName),
          )),
    ),
  );
};
