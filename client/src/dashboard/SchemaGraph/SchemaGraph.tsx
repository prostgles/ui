import * as d3 from "d3";
import type { SimulationLinkDatum, SimulationNodeDatum } from "d3";
import type { DBHandlerClient } from "prostgles-client/dist/prostgles";
import type { ValidatedColumnInfo } from "prostgles-types";
import React from "react";
import Select from "../../components/Select/Select";
import RTComp from "../RTComp";
import { drawSchema } from "./drawSchema";

type P = {
  db: DBHandlerClient;
  onClickTable: (tableName: string) => any;
};
type Text = { label: string; color: string };
interface Node extends SimulationNodeDatum {
  id: string;
  header: Text;
  text: Text[];
  height: number;
  width: number;
  hasLinks: boolean;
  cluster: number;
}
interface Link extends SimulationLinkDatum<Node> {
  id: string;
  sourceNode: Node;
  targetNode: Node;
  sourceColIndex: number;
  targetColIndex: number;
  sourceCol: string;
  targetCol: string;
  text: Text;
  color: string;
}

const DISPLAY_MODES = [
  { key: "all", label: "All tables" },
  { key: "relations", label: "With relations" },
  { key: "leaf", label: "Without relations" },
] as const;

export type SchemaGraphState = {
  nodes: Node[];
  links: Link[];
  displayMode: (typeof DISPLAY_MODES)[number]["key"];
};

export class SchemaGraph extends RTComp<P, SchemaGraphState> {
  state: SchemaGraphState = {
    nodes: [],
    links: [],
    displayMode: "all",
  };

  svgRef?: SVGElement;
  loaded = false;

  onDelta = (dP, dS) => {
    if (dS?.displayMode) {
      this.setChart();
    }
  };

  setChart = () => {
    if (!this.svgRef) return;

    const { displayMode, nodes: _nodes, links: _links } = this.state;

    let nodes = _nodes.map((n) => ({ ...n, x: 0, y: 0 })),
      links = _links.map((l) => ({ ...l }));

    if (displayMode === "leaf") {
      nodes = nodes.filter((n) => !n.hasLinks);
      links = [];
    } else if (displayMode === "relations") {
      nodes = nodes.filter((n) => n.hasLinks);
    }

    drawSchema({
      svgNode: this.svgRef,
      data: {
        nodes,
        //@ts-ignore
        links,
      },
      onClickNode: this.props.onClickTable,
    });
  };

  async onMount() {
    const { db } = this.props;
    if (!this.loaded && this.svgRef) {
      this.loaded = true;

      const newState: Pick<SchemaGraphState, "links" | "nodes"> = {
        nodes: [],
        links: [],
      };

      const colors = ["red", "blue"];

      const schema: Record<string, ValidatedColumnInfo[]> = {};

      await Promise.all(
        Object.entries(db).map(async ([tableName, tableHandler]) => {
          if ("getColumns" in tableHandler && tableHandler.getColumns) {
            const cols = await tableHandler.getColumns();
            if (cols.length) {
              schema[tableName] = cols;
            }
          }
        }),
      );

      const tableNames = Object.keys(schema);

      Object.entries(schema).forEach(([tableName, columns]) => {
        const node: SchemaGraphState["nodes"][number] = {
          id: tableName,
          header: { label: tableName, color: "black" },
          text: columns.map((c) => ({
            color: "gray",
            label: `${c.name} ${c.udt_name.toUpperCase()}`,
          })),
          height: 0,
          width: 0,
          x: 0,
          y: 0,
          hasLinks: false,
          cluster: 0,
        };
        node.height = Math.max(80, getSchemaTableColY(node.text.length + 1, 0));
        node.width = Math.min(
          400,
          10 +
            10 *
              Math.max(
                node.header.label.length,
                ...node.text.map((txt) => txt.label.length),
              ),
        );

        newState.nodes.push(node);

        /** Use same color for column chain */
        // const getColor = (n: Node, col: string): string | undefined => {
        //   return newState.links.find(l =>
        //     l.source === n.id && l.sourceCol === col ||
        //     l.target === n.id && l.targetCol === col
        //   )?.color;
        // }
      });

      Object.entries(schema).forEach(([tableName, columns]) => {
        const rels = columns.filter((c) =>
          c.references?.some((r) => tableNames.includes(r.ftable)),
        );

        rels.map((col, i) => {
          col.references?.map((r) => {
            const source = r.ftable;
            const sourceCol = r.fcols[0];
            if (
              !newState.links.find(
                (l) =>
                  [l.source, l.target].sort() === [tableName, source].sort(),
              )
            ) {
              newState.links.push({
                color: "blue",
                id: [source, tableName].sort().join(),
                source,
                target: tableName,
                sourceNode: newState.nodes.find((n) => n.id === source)!,
                targetNode: newState.nodes.find((n) => n.id === tableName)!,

                text: { label: col.name, color: "black" },
                sourceColIndex: schema[source]!.findIndex(
                  (c) => c.name === sourceCol,
                ),
                targetColIndex: schema[tableName]!.findIndex(
                  (c) => c.name === col.name,
                ),
                sourceCol: sourceCol!,
                targetCol: col.name,

                // source: tableName,
                // target: source,
                // sourceNode: newState.nodes.find(n => n.id ===tableName ),
                // targetNode: newState.nodes.find(n => n.id === source),
              });
            }
          });
        });
      });

      newState.nodes.forEach((node) => {
        const rels = newState.links.filter((l) =>
          [l.source, l.target].includes(node.id),
        );
        if (rels.length) {
          node.hasLinks = true;
          node.cluster = 1;
        }
      });

      this.svgRef.setAttribute("width", this.svgRef.clientWidth + "");
      this.svgRef.setAttribute("height", this.svgRef.clientHeight + "");
      this.setState(newState, () => {
        this.setChart();
      });
    }
  }

  divRef?: HTMLDivElement;
  render() {
    return (
      <div
        ref={(e) => {
          if (e) {
            this.divRef = e;
          }
        }}
        className="flex-col f-1 relative"
        style={{ minWidth: "80vw", minHeight: "80vh" }}
      >
        <Select
          value={this.state.displayMode}
          label="Display"
          variant="pill"
          fullOptions={DISPLAY_MODES}
          style={{ top: 0, left: 0, position: "absolute" }}
          onChange={(displayMode) => {
            this.setState({ displayMode });
          }}
        />
        <svg
          className="f-1"
          style={{ width: "100%", height: "100%" }}
          ref={(e) => {
            if (e) {
              this.svgRef = e;
            }
          }}
        >
          <g className="everything pointer">
            <g className="nodes"></g>
            <g className="links"></g>
          </g>
        </svg>
      </div>
    );
  }
}

export const getSchemaTableColY = (i, height) => {
  return (!i ? 8 : 16) + i * 20 - height / 2;
};

function forceCollide() {
  let nodes;

  function force(alpha) {
    const padding = 95;
    const quad = d3.quadtree(
      nodes,
      (d: any) => d.x,
      (d) => d.y,
    );
    for (const d of nodes) {
      quad.visit((q: any, x1, y1, x2, y2) => {
        let updated = false;
        if (q.data && q.data !== d) {
          let x = d.x - q.data.x,
            y = d.y - q.data.y;
          const xSpacing = padding + (q.data.width + d.width) / 2;
          const ySpacing = padding + (q.data.height + d.height) / 2;
          const absX = Math.abs(x);
          const absY = Math.abs(y);
          let l;
          let lx;
          let ly;

          if (absX < xSpacing && absY < ySpacing) {
            l = Math.sqrt(x * x + y * y);

            lx = (absX - xSpacing) / l;
            ly = (absY - ySpacing) / l;

            // the one that's barely within the bounds probably triggered the collision
            if (Math.abs(lx) > Math.abs(ly)) {
              lx = 0;
            } else {
              ly = 0;
            }
            d.x -= x *= lx;
            d.y -= y *= ly;
            q.data.x += x;
            q.data.y += y;

            updated = true;
          }
        }
        return updated;
      });
    }
  }

  force.initialize = (_) => (nodes = _);

  return force;
}

function zoomFit(svgNode, zoomHandler) {
  const bounds = svgNode.node().getBBox();
  const parent = svgNode.node().parentElement;
  const fullWidth = parent.clientWidth || parent.parentNode.clientWidth,
    fullHeight = parent.clientHeight || parent.parentNode.clientHeight;
  const width = bounds.width,
    height = bounds.height;
  const midX = bounds.x + width / 2,
    midY = bounds.y + height / 2;
  if (width == 0 || height == 0) return; // nothing to fit
  const scale = 0.85 / Math.max(width / fullWidth, height / fullHeight);
  const translate = [
    fullWidth / 2 - scale * midX,
    fullHeight / 2 - scale * midY,
  ];

  console.trace("zoomFit", translate, scale);

  zoomHandler.scaleTo(svgNode, scale);
  zoomHandler.translateTo(svgNode, ...translate);
}
