import type { DBHandlerClient } from "prostgles-client/dist/prostgles";
import type { ParsedJoinPath } from "prostgles-types";
import React from "react";
import Popup from "../components/Popup/Popup";
import { Chart } from "./Charts";
import type { CanvasChart, Shape } from "./Charts/CanvasChart";
import type { DBS } from "./Dashboard/DBS";
import type { CommonWindowProps } from "./Dashboard/Dashboard";
import type {
  Link,
  LinkSyncItem,
  WindowData,
  WindowSyncItem,
} from "./Dashboard/dashboardUtils";
import RTComp from "./RTComp";
import { JoinPathSelectorV2 } from "./W_Table/ColumnMenu/JoinPathSelectorV2";
import { getLinkColorV2 } from "./W_Map/getMapLayerQueries";

type P = {
  db: DBHandlerClient;
  dbs: DBS;
  onClose: VoidFunction;

  style?: object;
  className?: string;
  w: WindowSyncItem;
  windows: WindowSyncItem[];
  links: LinkSyncItem[];
  onLinkTable: (tblName: string, path: ParsedJoinPath[]) => any;
  anchorEl: Element;
  gridRef: Element;

  tables: CommonWindowProps["tables"];
};

type S = {
  loading: boolean;
  shapes?: Shape[];
  chartRef?: CanvasChart;
};

export class LinkMenu extends RTComp<P, S> {
  state: S = {
    loading: true,
    chartRef: undefined,
  };

  static getMyLinks = (
    _links: Link[],
    w: WindowData,
    windows: WindowData[],
  ) => {
    const getLinks = (links: Link[], allLinks: Link[]) => {
      return allLinks.filter((al) =>
        [al.w1_id, al.w2_id].some((alid) =>
          links.some((l) => [l.w1_id, l.w2_id].includes(alid)),
        ),
      );
    };
    const links = _links.filter((l) =>
      [l.w1_id, l.w2_id].every((wid) =>
        windows.some((w) => wid === w.id && !w.closed && !w.deleted),
      ),
    );

    let currLinks = links.filter((l) => [l.w1_id, l.w2_id].includes(w.id));
    let prevLinks = currLinks;
    let myLinks = [...currLinks];
    do {
      currLinks = getLinks(
        prevLinks,
        links.filter((l) => !myLinks.find((ml) => ml.id === l.id)),
      );
      prevLinks = currLinks;
      myLinks = myLinks.concat(currLinks);
    } while (currLinks.length);

    return myLinks;
  };

  loadShapes = () => {
    const { w, links, gridRef, windows, tables } = this.props;

    if (w.table_name && this.rootRef) {
      const shapes: Shape[] = [];

      const myLinks = LinkMenu.getMyLinks(links, w, windows); // links.filter(l => [l.w1_id, l.w2_id].includes(w.id));
      // const myWindows = windows.filter(w => !w.closed && !w.deleted && myLinks.some(l =>  [l.w1_id, l.w2_id].includes(w.id)));

      /**
       * If table then show directly linked tables (or maybe tree view of all possible joins?!)
       */

      const boxes: {
        id: string; //.dataset.boxId
        rect: DOMRect;
        w?: WindowData;
      }[] = [];

      gridRef
        .querySelectorAll<HTMLDivElement>("[data-box-id][data-box-type='item']")
        .forEach((n) => {
          const id = n.dataset.boxId!;
          const rect = n.getBoundingClientRect();
          const w = windows.find((w) => w.id === id);
          boxes.push({ id, rect, w });
        });

      const { colorStr } = getLinkColorV2(
        myLinks.find((l) => l.options.type !== "table"),
      );
      const { x, y } = this.rootRef.getBoundingClientRect();
      myLinks.forEach((l) => {
        const box1 = boxes.find((b) => b.id === l.w1_id),
          box2 = boxes.find((b) => b.id === l.w2_id),
          offsetCoord = (box: (typeof boxes)[number]): [number, number] => {
            return [
              box.rect.x + box.rect.width / 2 - x,
              box.rect.y + box.rect.height / 2 - y,
            ];
          };

        if (box1 && box2) {
          const getText = (
            w: WindowData | undefined,
            otherW: WindowData | undefined,
          ) => {
            if (!w) return "";
            if (l.options.type === "table") {
              return w.table_name!;
            } else {
              return `${l.options.joinPath?.at(-1)?.table ?? w.table_name ?? otherW?.table_name} (${l.options.columns.map((c) => c.name)})`;
            }
          };
          const textStyle = {
            font: "20px Arial",
            textAlign: "center" as const,
            elevation: 12,
            background: {
              fillStyle: "white",
              borderRadius: 12,
              padding: 12,
            },
          };
          shapes.push({
            id: 22,
            type: "multiline",
            coords: [offsetCoord(box1), offsetCoord(box2)],
            lineWidth: 6,
            strokeStyle: colorStr,
          });
          shapes.push({
            id: 1,
            type: "text",
            coords: offsetCoord(box1),
            fillStyle: "black",
            text: getText(box1.w, box2.w),
            ...textStyle,
          });
          shapes.push({
            id: 3,
            type: "text",
            coords: offsetCoord(box2),
            fillStyle: "black",
            text: getText(box2.w, box1.w),
            ...textStyle,
          });

          let joinTextLines: { color: string; text: string }[] = [];
          const w1 = windows.find((w) => w.id === box1.id);
          const w2 = windows.find((w) => w.id === box2.id);
          if (!w1 || !w2) return;

          const w1r = window.document.body
            .querySelector(`[data-box-id='${w1.id}']`)
            ?.getBoundingClientRect();
          const w2r = window.document.body
            .querySelector(`[data-box-id='${w2.id}']`)
            ?.getBoundingClientRect();

          if (!w1r || !w2r) return;

          const w1Above = Boolean(w1r.y < w2r.y);
          const w1Left = Boolean(w1r.x > w2r.x);
          const dominant =
            Math.abs(w1r.y - w2r.y) > Math.abs(w1r.x - w2r.x) ? "y" : "x";

          const parsedPath =
            l.options.type === "table" ?
              l.options.tablePath
            : l.options.joinPath;
          joinTextLines =
            parsedPath?.flatMap((p) => [
              {
                text: `(${Object.entries(p.on[0]!)
                  .map(([l, r]) => `${l} = ${r}`)
                  .join(" AND ")})`,
                color: "blue",
              },
              { text: p.table, color: "black" },
            ]) ?? [];

          let flip = false;
          if (!w1Above && dominant === "y") {
            flip = true;
          } else if (w1Left && dominant === "x") {
            joinTextLines = joinTextLines.slice(0).reverse();
          }
          if (flip) {
            joinTextLines = joinTextLines.slice(0).reverse();
          }

          if (joinTextLines.length) {
            const c1 = offsetCoord(box1),
              c2 = offsetCoord(box2),
              txtSize = 16;

            joinTextLines.map(({ text, color }, i) => {
              shapes.push({
                id: 22 + i,
                type: "text",
                coords: [
                  Math.round((c1[0] + c2[0]) / 2),
                  Math.round((c1[1] + c2[1]) / 2 + i * 2.5 * txtSize),
                ],
                fillStyle: color,
                font: txtSize + "px Arial",
                textAlign: "center",
                elevation: 12,
                background: {
                  fillStyle: "white",
                  borderRadius: 12,
                  padding: 10,
                  strokeStyle: color || "gray",
                  lineWidth: 1,
                },
                text,
              });
            });
          }
        }
      });

      this.setState({ loading: false, shapes });
      this.chartRef?.render(shapes);
    }
  };

  onDelta = async (dP, dS, dD) => {
    if (!this.state.shapes) {
      this.loadShapes();
    }
    this.state.chartRef?.render(this.state.shapes || []);
  };

  chartRef?: CanvasChart;
  rootRef?: HTMLDivElement;
  render() {
    const { onClose, anchorEl, onLinkTable, tables, w, links, windows } =
      this.props;

    const currentJoinedTables = windows
      .filter(
        ({ id, type, table_name }) =>
          table_name !== w.table_name &&
          type === "table" &&
          links.some((l) => [l.w1_id, l.w2_id].includes(id)),
      )
      .map((w) => w.table_name!);
    const canJoin = tables.some(
      (t) => t.name === w.table_name && t.joins.length,
    );

    return (
      <div
        className="LinkMenu absolute inset-0"
        ref={(e) => {
          if (e) this.rootRef = e;
        }}
      >
        <Popup
          onClose={onClose}
          title={canJoin ? "Add joined table" : undefined}
          collapsible={true}
          anchorEl={anchorEl}
          positioning="beneath-left"
          clickCatchStyle={{ opacity: 0, zIndex: 14 }}
          contentStyle={canJoin ? { padding: 0 } : { display: "none" }}
          rootStyle={{ zIndex: 14, maxWidth: "500px" }}
        >
          {canJoin && (
            <JoinPathSelectorV2
              // className="w-full"
              tableName={w.table_name!}
              value={undefined}
              tables={tables}
              getFullOption={(path) =>
                (
                  path.length === 1 &&
                  currentJoinedTables.includes(path.at(-1)!.table)
                ) ?
                  { disabledInfo: "Already joined" }
                : undefined
              }
              variant="expanded"
              onChange={(targetPath) => {
                onLinkTable(targetPath.table.name, targetPath.path);
                onClose();
              }}
            />
          )}
        </Popup>

        <Chart
          className=" h-full w-full"
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 14,
            backdropFilter: "blur(1px)",
          }}
          setRef={(chart) => {
            this.chartRef = chart;
            this.setState({ chartRef: chart });
          }}
        />
      </div>
    );
  }
}
