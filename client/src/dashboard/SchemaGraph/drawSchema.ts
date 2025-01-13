import { getSchemaTableColY, type SchemaGraphState } from "./SchemaGraph";
import * as d3 from "d3";
import type { Node, Link } from "./types";

type GraphParams = {
  svgNode: SVGElement;
  data: {
    nodes: Node[];
    links: Link[];
  };
  onClickNode: (id: string) => void;
};

function calculateNodeReferences(nodes: Node[], links: Link[]) {
  // Count incoming and outgoing references for each node
  const refCounts = new Map<string, { in: number; out: number }>();

  nodes.forEach((node) => {
    refCounts.set(node.id, { in: 0, out: 0 });
  });

  links.forEach((link) => {
    // Handle both string IDs and Node objects for source/target
    const sourceId =
      typeof link.source === "string" ? link.source : link.source.id;
    const targetId =
      typeof link.target === "string" ? link.target : link.target.id;

    const sourceCount = refCounts.get(sourceId);
    const targetCount = refCounts.get(targetId);

    if (sourceCount) sourceCount.out++;
    if (targetCount) targetCount.in++;
  });

  return refCounts;
}

function positionNodes(
  nodes: Node[],
  links: Link[],
  width: number,
  height: number,
) {
  const refCounts = calculateNodeReferences(nodes, links);

  // Sort nodes by total references (in + out)
  const sortedNodes = [...nodes].sort((a, b) => {
    const aCount = refCounts.get(a.id) || { in: 0, out: 0 };
    const bCount = refCounts.get(b.id) || { in: 0, out: 0 };
    return bCount.in + bCount.out - (aCount.in + aCount.out);
  });

  const centerX = width / 2;
  const centerY = height / 2;

  // Fixed minimum spacing between nodes
  const minSpacing = 15;

  // Calculate node dimensions
  const maxNodeWidth = Math.max(...nodes.map((n) => n.width));
  const maxNodeHeight = Math.max(...nodes.map((n) => n.height));

  // Calculate grid dimensions
  const gridSize = Math.ceil(Math.sqrt(nodes.length));
  const cellWidth = maxNodeWidth + minSpacing;
  const cellHeight = maxNodeHeight + minSpacing;

  // Calculate total grid width and height
  const totalWidth = cellWidth * gridSize;
  const totalHeight = cellHeight * gridSize;

  // Position nodes in a grid pattern
  sortedNodes.forEach((node, i) => {
    if (i === 0) {
      // Most referenced node goes in center
      node.x = centerX;
      node.y = centerY;
    } else {
      // Calculate grid position (spiral out from center)
      const gridX = i % gridSize;
      const gridY = Math.floor(i / gridSize);

      // Offset from center
      const offsetX = (gridX - gridSize / 2) * cellWidth;
      const offsetY = (gridY - gridSize / 2) * cellHeight;

      node.x = centerX + offsetX;
      node.y = centerY + offsetY;
    }
  });

  // Add tiny jitter to prevent perfect alignment
  sortedNodes.forEach((node, i) => {
    if (i !== 0) {
      const jitterAmount = minSpacing / 3;
      node.x += (Math.random() - 0.5) * jitterAmount;
      node.y += (Math.random() - 0.5) * jitterAmount;
    }
  });
}

export const drawSchema = (args: GraphParams) => {
  const { svgNode, data, onClickNode } = args;

  const nd = svgNode as any;
  if (nd.d3Sim) nd.d3Sim.stop?.();
  const HEADER_HEIGHT = 30;
  const PADDING = 5;
  // Create somewhere to put the force directed graph
  const svg = d3.select(svgNode),
    width = +svg.attr("width"),
    height = +svg.attr("height");

  const rectWidth = 240;
  const rectHeight = 60;
  const minDistance = Math.sqrt(
    rectWidth * rectWidth + rectHeight * rectHeight,
  );

  // Position nodes before drawing
  positionNodes(data.nodes, data.links, width, height);

  // Add encompassing group for the zoom
  const g = svg.select("g.everything"),
    gLinks = g.select("g.links"),
    gNodes = g.select("g.nodes");

  const linkSel = gLinks
    .selectAll<SVGPathElement, Link>("path.link")
    .data(data.links, (d: Link) => d.id);

  const link = linkSel
    .enter()
    .append("path")
    .attr("class", "link")
    .attr("stroke-width", 2)
    .attr("fill", "none")
    .attr("stroke", (d: Link) => d.color)
    .merge(linkSel as any);

  linkSel.exit().remove();

  const nodeSel = gNodes
    .selectAll<SVGGElement, Node>("g.node")
    .data(data.nodes, (d: Node) => d.id);

  const node = nodeSel
    .enter()
    .append("g")
    .attr("class", "node")
    .merge(nodeSel as any);

  nodeSel.exit().remove();

  // node.on("click", function(e, d) {
  //   onClickNode(d.id)
  // });

  node
    .on("mouseover", function (d) {
      d3.select(this).select("rect").style("fill", "#f3f3f3");
    })
    .on("mouseout", function (d) {
      d3.select(this).select("rect").style("fill", "white");
    });
  const rect = node
    .append("rect")
    .attr("x", (d) => -d.width / 2)
    .attr("y", (d) => -d.height / 2)
    .attr("width", (d) => d.width)
    .attr("height", (d) => d.height)
    .attr("fill", "white")
    .attr("stroke", "grey");
  const headerRect = node
    .append("rect")
    .attr("x", (d) => -d.width / 2)
    .attr("y", (d) => -d.height / 2)
    .attr("width", (d) => d.width)
    .attr("height", (d) => HEADER_HEIGHT)
    .attr("fill", "#e1e1e1");

  const text = node
    .append("text")
    .attr("x", (d) => PADDING + -d.width / 2)
    .attr("y", (d) => 0) // (-d.height/2))
    .style("text-anchor", "start")
    .each(function (d) {
      const { width, height, id } = d;
      const tspans = d3
        .select(this)
        .selectAll("tspan")
        .data([d.header, ...d.text])
        .enter()
        .append("tspan");

      tspans
        .attr("x", PADDING + -width / 2)
        .attr("y", (d, i) => getSchemaTableColY(i, height))
        .text((text) => text.label)
        .style("dominant-baseline", "hanging")
        .style("fill", (d, i) => d.color)
        .style("font-size", (d, i) => (!i ? 18 : 14));
      // .each((d, i, nodes)=> {
      //   const node = d3.select(this)
      //   console.log(nodes[i].getBBox())
      // });
    });

  // startSimulation(node);

  // const drag_handler =

  const drag = d3
    .drag<SVGGElement, Node>()
    .on("start", dragStarted)
    .on("drag", dragged)
    .on("end", dragEnded);

  function dragStarted(event: d3.D3DragEvent<SVGGElement, Node, any>, d: Node) {
    //@ts-ignore
    d3.select<SVGGElement, Node>(this).classed("dragging", true);
  }

  function dragged(event: d3.D3DragEvent<SVGGElement, Node, any>, d: Node) {
    d.x = event.x;
    d.y = event.y;
    //@ts-ignore
    d3.select<SVGGElement, Node>(this).attr(
      "transform",
      `translate(${d.x},${d.y})`,
    );

    updateLinks();
  }

  function dragEnded(event: d3.D3DragEvent<SVGGElement, Node, any>, d: Node) {
    //@ts-ignore
    d3.select<SVGGElement, Node>(this).classed("dragging", false);
  }

  // Apply drag behavior
  node.call(drag);

  // Zoom functions
  function zoom_actions(event) {
    g.attr("transform", event.transform);
  }
  // Add zoom capabilities
  const zoom_handler = d3.zoom().on("zoom", zoom_actions);
  zoom_handler(svg as any);

  // function startSimulation(node){
  //   const clusters: Node[] = [];
  //   data.nodes.forEach(node => {
  //     if(!clusters[node.cluster]){
  //       clusters[node.cluster] = node;
  //     } else {
  //       if(clusters[node.cluster].width < node.width){
  //         clusters[node.cluster].width = node.width
  //       }
  //       if(clusters[node.cluster].height < node.height){
  //         clusters[node.cluster].height = node.height
  //       }
  //     }
  //   })

  //   // Set up the simulation and add forces
  //   const simulation = d3.forceSimulation<Node, Link>()
  //     .nodes(data.nodes);

  //   node.d3Sim = simulation;

  //   const link_force =  d3.forceLink<Node, Link>(data.links)
  //     .id(function(d) {
  //       return d.id;
  //     })
  //     // .distance(d => 50 + (Math.max(d.sourceNode.width, d.sourceNode.height)/2) + (Math.max(d.targetNode.width, d.targetNode.height)/2)).strength(1);
  //     .distance(d => (Math.max(d.sourceNode.width, d.sourceNode.height)/2) + (Math.max(d.targetNode.width, d.targetNode.height)/2)).strength(1);

  //   const charge_force = d3.forceManyBody<Node>()

  //     /** If no links then reduce repelant force to keep it compact */
  //     .strength(node => {
  //       if(!node.hasLinks){
  //         return -200
  //       }
  //       return -1200
  //     });

  //   const center_force = d3.forceCenter(width / 2, height / 2);

  //   simulation
  //     .force("charge_force", charge_force)
  //     .force("center_force", center_force)
  //     .force("links", link_force)

  //     // .force("x", d3.forceX().strength(.7))
  //     // .force("y", d3.forceY().strength(.7))

  //     .force("x", d3.forceY((d: Node, i) => {
  //       return d.hasLinks? width / 2 : (width/(i+1))

  //     }).strength(0.10))
  //     .force("y", d3.forceY((d: Node) => {
  //       return d.hasLinks? height/2 : 0

  //     }).strength(0.10))

  //     .force("collide", forceCollide())
  //     // .force("cluster", forceCluster);

  //   node.style("opacity", 0.5)
  //   node.attr("transform", function(d) {
  //     return "translate(" + d.x + "," + d.y + ")"
  //   });

  //   // Add tick instructions:
  //   simulation.on("tick", tickActions );
  //   simulation.on("end", () => {

  //     // console.log(zoom_handler);
  //     // zoomFit(svg, zoom_handler)
  //     zoom_handler.scaleTo(svg, .5)
  //     // return
  //     // zs = zoom.scale()
  //     // zt = zoom.translate();
  //     // dx = (w/2.0/zs) - d.x;
  //     // dy = (h/2.0/zs) - d.y;
  //     // zoom.translate([dx, dy]);
  //     // zoom.scale(zs);
  //   })

  //   function tickActions() {

  //     // update node positions each tick of the simulation
  //     node.attr("transform", function(d) {
  //       // const x = Math.max(d.width/2, Math.min(d.x, width - d.width/2)),
  //       //   y = Math.max(0, Math.min(d.y, height - d.height/2));
  //       const { x, y } = d;
  //       return "translate(" + x + "," + y + ")"
  //     });

  //     const linkHorizontal = d3.linkHorizontal()
  //         .source(((d: any) => {
  //           const sourceLeft = d.source.x < d.target.x;
  //           const res = {
  //             x: d.source.x + (sourceLeft? .5 : -.5) * (d.source.width),
  //             y: d.source.y + 25 + getColY(d.sourceColIndex, d.source.height)
  //           };
  //           return res;
  //         }) as any)
  //         .target(((d: any) => {
  //           const sourceLeft = d.source.x < d.target.x;
  //           const res = {
  //             x: d.target.x - (sourceLeft? .5 : -0.5) * (d.target.width),
  //             y: d.target.y + 30 + getColY(d.targetColIndex, d.target.height)
  //           };
  //           return res;
  //         }) as any)
  //         .x((d: any) => d.x)
  //         .y((d: any) => d.y),
  //       linkVertical = d3.linkVertical()
  //         .x((d: any) => d.x)
  //         .y((d: any) => d.y);

  //     link.attr("d", ((d: any) => {
  //       // let d = { ..._d }; //{ source: { x: 0, y: 0 }, target: { x: 220, y: 120 }}
  //       // const sourceLeft = d.source.x < d.target.x;
  //       // const sourceBelow = d.source.y > d.target.y;
  //       // d.source.x =+ (sourceLeft? 1 : -1) * d.source.width/2;
  //       // d.source.y =- (sourceBelow? 1 : -1) * d.source.height/2;

  //       // if(Math.abs(d.source.x - d.target.x) < Math.abs(d.source.y - d.target.y)) {
  //       //   return linkVertical(d)
  //       // }
  //       return linkHorizontal(d)
  //     }) as any)
  //   }

  //   const { nodes } = data;
  //   function forceCluster(alpha) {
  //     for (let i = 0, n = nodes.length, node, cluster, k = alpha * 1; i < n; ++i) {
  //       node = nodes[i];
  //       cluster = clusters[node.cluster];
  //       node.vx -= (node.x - cluster.x) * k;
  //       node.vy -= (node.y - cluster.y) * k;
  //     }
  //   }
  // }

  // After creating nodes, set their initial positions
  node.attr("transform", (d) => `translate(${d.x},${d.y})`);

  // Create a function to update link positions
  function updateLinks() {
    // Helper to check if a point is inside a table's bounds
    function isPointNearTable(x: number, y: number, node: Node, padding = 20) {
      const left = node.x - node.width / 2 - padding;
      const right = node.x + node.width / 2 + padding;
      const top = node.y - node.height / 2 - padding;
      const bottom = node.y + node.height / 2 + padding;

      return x >= left && x <= right && y >= top && y <= bottom;
    }

    // Helper to find tables that intersect with a line segment
    function findIntersectingTables(
      x1: number,
      y1: number,
      x2: number,
      y2: number,
      excludeNodes: Node[],
    ) {
      return data.nodes.filter((node) => {
        if (excludeNodes.includes(node)) return false;

        // Check if line segment intersects with table bounds
        const left = node.x - node.width / 2 - 20;
        const right = node.x + node.width / 2 + 20;
        const top = node.y - node.height / 2 - 20;
        const bottom = node.y + node.height / 2 + 20;

        // Simple line-box intersection test
        const minX = Math.min(x1, x2);
        const maxX = Math.max(x1, x2);
        const minY = Math.min(y1, y2);
        const maxY = Math.max(y1, y2);

        if (maxX < left || minX > right || maxY < top || minY > bottom) {
          return false;
        }

        return true;
      });
    }

    link.attr("d", (l: Link) => {
      const sourceId = typeof l.source === "string" ? l.source : l.source.id;
      const targetId = typeof l.target === "string" ? l.target : l.target.id;

      const source = data.nodes.find((n) => n.id === sourceId);
      const target = data.nodes.find((n) => n.id === targetId);

      if (!source || !target) return "";

      const sourceX = source.x + source.width / 2;
      const sourceY =
        source.y + getSchemaTableColY(l.sourceColIndex, source.height);
      const targetX = target.x - target.width / 2;
      const targetY =
        target.y + getSchemaTableColY(l.targetColIndex, target.height);

      // Find path around obstacles
      const dx = targetX - sourceX;
      const dy = targetY - sourceY;
      const distance = Math.sqrt(dx * dx + dy * dy);

      // Try different vertical offsets until we find a clear path
      const baseOffset = Math.min(100, distance / 3);
      const offsets = [
        0,
        baseOffset,
        -baseOffset,
        baseOffset * 2,
        -baseOffset * 2,
      ];

      for (const offset of offsets) {
        // Try a path with this offset
        const cp1x = sourceX + distance / 4;
        const cp1y = sourceY + offset;
        const cp2x = sourceX + (distance * 3) / 4;
        const cp2y = targetY + offset;

        // Check if this path intersects any tables
        const intersections = findIntersectingTables(
          sourceX,
          sourceY,
          cp1x,
          cp1y,
          [source, target],
        )
          .concat(
            findIntersectingTables(cp1x, cp1y, cp2x, cp2y, [source, target]),
          )
          .concat(
            findIntersectingTables(cp2x, cp2y, targetX, targetY, [
              source,
              target,
            ]),
          );

        if (intersections.length === 0) {
          // Found a clear path
          return [
            `M ${sourceX},${sourceY}`,
            `C ${cp1x},${cp1y}`,
            `  ${cp2x},${cp2y}`,
            `  ${targetX},${targetY}`,
          ].join(" ");
        }
      }

      // If no clear path found, use a path with maximum offset
      const fallbackOffset = Math.max(150, distance / 2);
      const sign = sourceY > targetY ? -1 : 1;

      return [
        `M ${sourceX},${sourceY}`,
        `C ${sourceX + distance / 4},${sourceY + sign * fallbackOffset}`,
        `  ${sourceX + (distance * 3) / 4},${targetY + sign * fallbackOffset}`,
        `  ${targetX},${targetY}`,
      ].join(" ");
    });
  }

  // Call updateLinks initially to set link positions
  updateLinks();
};
