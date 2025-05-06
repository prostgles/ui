import { usePromise } from "prostgles-client/dist/react-hooks";
import type { SchemaGraphProps } from "../SchemaGraph";
import { PG_OBJECT_QUERIES } from "../../SQLEditor/SQLCompletion/getPGObjects";
import { isEmpty } from "../../../utils";
import { fetchNamedSVG } from "../../../components/SvgIcon";
import { getCssVariableValue } from "../../Charts/onRenderTimechart";
import { COLOR_PALETTE } from "../../W_Table/ColumnMenu/ColorPicker";

export const useFetchSchemaForDiagram = ({
  db,
  dbs,
  connectionId,
  tables,
  canvasRef,
}: SchemaGraphProps & {
  canvasRef: React.RefObject<HTMLCanvasElement>;
}) => {
  const { data: dbConf } = dbs.database_configs.useFindOne({
    $existsJoined: {
      connections: {
        id: connectionId,
      },
    },
  });

  const schemaInfo = usePromise(async () => {
    const constraints =
      !db.sql ?
        []
      : ((await db.sql(
          PG_OBJECT_QUERIES.constraints.sql,
          {},
          { returnType: "rows" },
        )) as (typeof PG_OBJECT_QUERIES.constraints.type)[]);

    const fkeys = constraints.filter((c) => c.contype === "f");
    const getRefs = (
      tableName: string,
      relType: "references" | "referencedBy",
    ) => {
      const referencedBy = fkeys.filter(
        ({ table_name, ftable_name }) =>
          (relType === "referencedBy" ? ftable_name : table_name) === tableName,
      );
      return referencedBy;
    };
    const tablesWithRefInfo = tables
      .map((t) => ({
        ...t,
        references: getRefs(t.name, "references"),
        referencedBy: getRefs(t.name, "referencedBy"),
      }))
      .sort((a, b) => {
        /** Least references */
        const leastReferences = a.references.length - b.references.length;
        const mostReferenced = b.referencedBy.length - a.referencedBy.length;
        return leastReferences || mostReferenced;
      });

    const { clientHeight, clientWidth } =
      canvasRef.current ?? window.document.body;
    let existingPositions = dbConf?.table_schema_positions;
    if (!existingPositions || isEmpty(existingPositions)) {
      let prevPosition = { x: 0, y: 0 };
      existingPositions = tablesWithRefInfo.reduce((acc, t) => {
        const newY = prevPosition.y + 300;
        const newX = prevPosition.x + 300;
        const tablePosition =
          newY > clientHeight ?
            {
              x: newX,
              y: 0,
            }
          : {
              x: prevPosition.x,
              y: newY,
            };
        prevPosition = tablePosition;
        return {
          ...acc,
          [t.name]: tablePosition,
        };
      }, {});
    }

    const availableColors = [...COLOR_PALETTE.filter((c) => c !== "#ffffff")]; //exclude white
    const tablesWithPositions = await Promise.all(
      tablesWithRefInfo.map(async (t) => {
        const position = existingPositions[t.name];

        return {
          ...t,
          rootColor: availableColors.shift(),
          iconImage:
            !t.icon ? undefined : (
              await fetchSVGImage(t.icon, getCssVariableValue("--text-2"))
            ),
          position,
        };
      }),
    );
    return {
      tablesWithPositions,
      fkeys,
    };
  }, [canvasRef, db, dbConf?.table_schema_positions, tables]);

  return { schemaInfo, dbConfId: dbConf?.id };
};

const fetchSVGImage = (iconName: string, currentcolor: string) => {
  return fetchNamedSVG(iconName).then((rawSvgString) => {
    if (!rawSvgString) return;
    const svgString = rawSvgString.replaceAll("currentcolor", currentcolor);
    return new Promise<HTMLImageElement>((resolve) => {
      // Create a data URL
      const img = new Image();
      img.src =
        "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svgString);

      img.onload = function () {
        resolve(img);
      };
    });
  });
};
