
import * as d3 from "d3";
import { SimulationLinkDatum, SimulationNodeDatum } from "d3";
import { DBHandlerClient } from "prostgles-client/dist/prostgles";
import { ValidatedColumnInfo } from "prostgles-types";
import React from "react";
import Select from "../components/Select/Select";
import RTComp from "./RTComp";

type P = {
  db: DBHandlerClient;
  onClickTable: (tableName: string) => any;
} 
type Text = { label: string; color: string; };
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
  source: string;
  target: string;
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
  { key: "leaf", label: "Without relations" }
] as const;

type S = {
  nodes: Node[];
  links: Link[];
  displayMode: typeof DISPLAY_MODES[number]["key"]
}

export default class SchemaGraph extends RTComp<P, S> {

  state: S = {
    nodes: [],
    links: [],
    displayMode: "all",
  }

  svgRef?: SVGElement;
  loaded = false;

  onDelta = (dP, dS) => {
    if(dS?.displayMode){
      this.setChart();
    }
  }

  setChart = () => {
    if(!this.svgRef) return;

    const { displayMode, nodes: _nodes, links: _links } = this.state;

    let nodes = _nodes.map(n => ({ ...n })),
      links = _links.map(l => ({ ...l }));

    if(displayMode === "leaf"){
      nodes = nodes.filter(n => !n.hasLinks);
      links = [];
    } else if(displayMode === "relations"){
      nodes = nodes.filter(n => n.hasLinks);
    }

    loadGraph({
      svgNode: this.svgRef, 
      data: { 
        nodes,
        links,
      },
      onClickNode: this.props.onClickTable
    });
  }

  async onMount(){
    const { db } = this.props;
    if(!this.loaded && this.svgRef){
      this.loaded = true;

      const newState: Pick<S, "links" | "nodes"> = {
        nodes: [],
        links: [],
      }

      const colors = ["red", "blue"];

      const schema: Record<string, ValidatedColumnInfo[]> = {}

      await Promise.all(Object.entries(db).map(async ([tableName, tableHandler]) => {
        if("getColumns" in tableHandler && tableHandler.getColumns){
          const cols = await tableHandler.getColumns();
          if(cols.length){
            schema[tableName] = cols;
          }
        }
      }));

      const tableNames = Object.keys(schema);

      Object.entries(schema).forEach(([tableName, columns]) => {
        const node: S["nodes"][number] = {
          id: tableName,
          header: { label: tableName, color: "black" },
          text: columns.map(c => ({ color: "gray", label: `${c.name} ${c.udt_name.toUpperCase()}`})),
          height: 0,
          width: 0,
          hasLinks: false,
          cluster: 0,
        }
        node.height = Math.max(80, getColY(node.text.length + 1, 0));
        node.width = Math.min(400, 10 + 10 * Math.max( node.header.label.length, ...node.text.map(txt => txt.label.length)));

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
        const rels = columns.filter(c => c.references?.some(r => tableNames.includes(r.ftable)));

        rels.map((col, i) => {
          col.references?.map(r => {

            const source = r.ftable;
            const sourceCol = r.fcols[0];
            if(!newState.links.find(l => [l.source, l.target].sort() === [tableName, source].sort())){
  
              newState.links.push({
                color: "blue",
                id: [source, tableName].sort().join(),
                source,
                target: tableName,
                sourceNode: newState.nodes.find(n => n.id === source),
                targetNode: newState.nodes.find(n => n.id === tableName),
  
                text: { label: col.name, color: "black" },
                sourceColIndex: schema[source].findIndex(c => c.name === sourceCol),
                targetColIndex: schema[tableName].findIndex(c => c.name === col.name),
                sourceCol: sourceCol,
                targetCol: col.name,
  
                // source: tableName,
                // target: source,
                // sourceNode: newState.nodes.find(n => n.id ===tableName ),
                // targetNode: newState.nodes.find(n => n.id === source),
              })
            }
          })
        })
      });

      newState.nodes.forEach(node => {
        const rels = newState.links.filter(l => [l.source, l.target].includes(node.id))
        if(rels.length){
          node.hasLinks = true;
          node.cluster = 1;
        }
      });
      
      this.svgRef.setAttribute("width", this.svgRef.clientWidth + "");
      this.svgRef.setAttribute("height", this.svgRef.clientHeight + "");
      this.setState(newState, ()  => {
        this.setChart();
      });
    }
  }

  render(){
    return <div className="flex-col f-1" style={{ minWidth: "80vw", minHeight: "80vh" }} >
        <Select 
          value={this.state.displayMode}
          label="Display" 
          fullOptions={DISPLAY_MODES} 
          style={{ top: "10px", left: "10px", position: "absolute" }}
          onChange={displayMode => {
            this.setState({ displayMode })
          }}
        />
        <svg className="f-1" 
          style={{ width: "100%", height: "100%" }} 
          ref={e => {
            if(e){  this.svgRef = e; }
          }}
        >
          <g className="everything pointer">

            <g className="nodes">
            
            </g>
            <g className="links">
            
            </g>
          </g>
        </svg>
    </div>;
  }
}

function getColY(i, height){ 
  return ((!i? 8 : 16) + i * 20 - height/2) 
}

type GraphParams = { 
  svgNode: SVGElement; 
  data: { nodes: S["nodes"]; links: S["links"] };
  onClickNode: (id: string) => any
}
function loadGraph(args: GraphParams){
  const { svgNode, data, onClickNode } = args;

  const nd = svgNode as any;
  if(nd.d3Sim) nd.d3Sim.stop?.()
  const HEADER_HEIGHT = 30;
  const PADDING = 5;
  // Create somewhere to put the force directed graph
  const svg = d3.select(svgNode),
    width = +svg.attr("width"),
    height = +svg.attr("height");
    

  const rectWidth = 240;
  const rectHeight = 60;
  const minDistance = Math.sqrt(rectWidth*rectWidth + rectHeight*rectHeight);

  // data.nodes.forEach(n => {
  //   n.x = n.hasLinks?  width/2 : 0;
  //   n.y = n.hasLinks?  height/2 : 0;
  //   // n.fy = n.x;
  //   // n.fx = n.y;
  // });


  // Add encompassing group for the zoom
  const g = svg.select("g.everything"),
    gLinks = g.select("g.links"),
    gNodes = g.select("g.nodes");

  const linkSel = gLinks
    .selectAll("path.link")
    .data(data.links, (d => d.id) as any);

  const link = linkSel.enter()
    .append("path")
      .attr('class', 'link')
      .attr("stroke-width", 2)
      .attr('fill', 'none')
      .attr('stroke', d => d.color)
      .merge(linkSel as any);
      
  linkSel.exit().remove();

  const nodeSel = gNodes.selectAll("g.node")
    .data(data.nodes, (d => d.id) as any);

  const node = nodeSel
    .enter()
      .append("g")
      .attr('class', 'node')  
      .merge(nodeSel as any);

  nodeSel.exit().remove();

  node.on("click", function(e, d) { 
    onClickNode(d.id)
  });

  node.on("mouseover", function(d) {
      d3.select(this).select("rect").style("fill", "#f3f3f3");
    })
    .on("mouseout", function(d) {
      d3.select(this).select("rect").style("fill", "white");
    });
  const rect = node.append("rect")
      .attr("x", d => -d.width/2)
      .attr("y", d => -d.height/2)
      .attr("width", d => d.width)
      .attr("height", d => d.height)
      .attr("fill", "white")
      .attr("stroke", "grey")
  const headerRect = node.append("rect")
      .attr("x", d => -d.width/2)
      .attr("y", d => -d.height/2)
      .attr("width", d => d.width)
      .attr("height", d => HEADER_HEIGHT)
      .attr("fill", "#e1e1e1")


  const text = node.append("text")
    .attr("x", d => PADDING + -d.width/2)
    .attr("y", d => 0)// (-d.height/2))
    .style("text-anchor", "start")
    .each(function(d) {
      const { width, height, id } = d;
      const tspans = d3.select(this).selectAll("tspan").data([d.header, ...d.text]).enter().append("tspan")
        
      tspans.attr("x", PADDING + -width/2)
        .attr("y", (d, i) => getColY(i, height) )
        .text(text => text.label)
        .style("dominant-baseline", "hanging")
        .style("fill", (d, i) => d.color)
        .style("font-size", (d, i) => ( !i? 18 : 14))
        // .each((d, i, nodes)=> {
        //   const node = d3.select(this)
        //   console.log(nodes[i].getBBox())
        // });
    });

  startSimulation(node);

  setZoomDrag(node);

  function setZoomDrag (node) {

    // Add drag capabilities
    const drag_handler = d3.drag()
      .on("start", drag_start)
      .on("drag", drag_drag)
      .on("end", drag_end);

    node.call(drag_handler);
      
    // Drag functions
    function drag_start(d) {
      // if (!d.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }

    // Make sure you can't drag the rect outside the box
    function drag_drag(d) {
      d.fx = d.x;
      d.fy = d.y;
    }

    function drag_end(d) {
      // if (!d.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    }

    // Zoom functions
    function zoom_actions(event){
      g.attr("transform", event.transform)
    }

    // Add zoom capabilities
    const zoom_handler = d3.zoom()
      .on("zoom", zoom_actions);
      zoom_handler(svg);

  } 
  
  function startSimulation(node){
    const clusters: Node[] = [];
    data.nodes.forEach(node => {
      if(!clusters[node.cluster]){
        clusters[node.cluster] = node;
      } else {
        if(clusters[node.cluster].width < node.width){
          clusters[node.cluster].width = node.width
        }
        if(clusters[node.cluster].height < node.height){
          clusters[node.cluster].height = node.height
        }
      }
    })

    // Set up the simulation and add forces
    const simulation = d3.forceSimulation<Node, Link>()
      .nodes(data.nodes);
    
    node.d3Sim = simulation;
    
    const link_force =  d3.forceLink<Node, Link>(data.links)
      .id(function(d) { 
        return d.id; 
      })
      // .distance(d => 50 + (Math.max(d.sourceNode.width, d.sourceNode.height)/2) + (Math.max(d.targetNode.width, d.targetNode.height)/2)).strength(1);
      .distance(d => (Math.max(d.sourceNode.width, d.sourceNode.height)/2) + (Math.max(d.targetNode.width, d.targetNode.height)/2)).strength(1);

    const charge_force = d3.forceManyBody<Node>()
      
      /** If no links then reduce repelant force to keep it compact */
      .strength(node => {
        if(!node.hasLinks){
          return -200
        }
        return -1200
      });
  
    const center_force = d3.forceCenter(width / 2, height / 2);
  
    simulation
      .force("charge_force", charge_force)
      .force("center_force", center_force)
      .force("links", link_force)

      // .force("x", d3.forceX().strength(.7))
      // .force("y", d3.forceY().strength(.7))

      .force('x', d3.forceY((d: Node, i) => {
        return d.hasLinks? width / 2 : (width/(i+1))

      }).strength(0.10))
      .force('y', d3.forceY((d: Node) => {
        return d.hasLinks? height/2 : 0
        
      }).strength(0.10))

      .force("collide", forceCollide())
      // .force("cluster", forceCluster);
  

    node.style("opacity", 0.5)
    node.attr("transform", function(d) {
      return "translate(" + d.x + "," + d.y + ")"
    });

    // Add tick instructions:
    simulation.on("tick", tickActions );
    simulation.on("end", () => {
      
      // console.log(zoom_handler);
      // zoomFit(svg, zoom_handler)
      zoom_handler.scaleTo(svg, .5)
      // return
      // zs = zoom.scale()
      // zt = zoom.translate();
      // dx = (w/2.0/zs) - d.x;
      // dy = (h/2.0/zs) - d.y;
      // zoom.translate([dx, dy]);
      // zoom.scale(zs);
    })


    function tickActions() {

      // update node positions each tick of the simulation
      node.attr("transform", function(d) {
        // const x = Math.max(d.width/2, Math.min(d.x, width - d.width/2)),
        //   y = Math.max(0, Math.min(d.y, height - d.height/2));
        const { x, y } = d;
        return "translate(" + x + "," + y + ")"
      });

      const linkHorizontal = d3.linkHorizontal()
          .source(((d: any) => {
            const sourceLeft = d.source.x < d.target.x;
            const res = { 
              x: d.source.x + (sourceLeft? .5 : -.5) * (d.source.width), 
              y: d.source.y + 25 + getColY(d.sourceColIndex, d.source.height)
            };
            return res;
          }) as any)
          .target(((d: any) => {
            const sourceLeft = d.source.x < d.target.x;
            const res = {
              x: d.target.x - (sourceLeft? .5 : -0.5) * (d.target.width), 
              y: d.target.y + 30 + getColY(d.targetColIndex, d.target.height)
            };
            return res;
          }) as any)
          .x((d: any) => d.x)
          .y((d: any) => d.y),
        linkVertical = d3.linkVertical()
          .x((d: any) => d.x)
          .y((d: any) => d.y);

      link.attr("d", ((d: any) => {
        // let d = { ..._d }; //{ source: { x: 0, y: 0 }, target: { x: 220, y: 120 }}
        // const sourceLeft = d.source.x < d.target.x;
        // const sourceBelow = d.source.y > d.target.y;
        // d.source.x =+ (sourceLeft? 1 : -1) * d.source.width/2;
        // d.source.y =- (sourceBelow? 1 : -1) * d.source.height/2;

        // if(Math.abs(d.source.x - d.target.x) < Math.abs(d.source.y - d.target.y)) {
        //   return linkVertical(d)
        // }
        return linkHorizontal(d)
      }) as any)
    }

    const { nodes } = data;
    function forceCluster(alpha) {
      for (let i = 0, n = nodes.length, node, cluster, k = alpha * 1; i < n; ++i) {
        node = nodes[i];
        cluster = clusters[node.cluster];
        node.vx -= (node.x - cluster.x) * k;
        node.vy -= (node.y - cluster.y) * k;
      }
    }
  }

}



function forceCollide() {
  let nodes;

  function force(alpha) {
    const padding = 95
    const quad = d3.quadtree(nodes, (d: any) => d.x, d => d.y);
    for (const d of nodes) {
      quad.visit((q: any, x1, y1, x2, y2) => {
        let updated = false;
        if(q.data && q.data !== d){
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

  force.initialize = _ => nodes = _;

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
  const translate = [fullWidth / 2 - scale * midX, fullHeight / 2 - scale * midY];

  console.trace("zoomFit", translate, scale);

  zoomHandler.scaleTo(svgNode, scale)
  zoomHandler.translateTo(svgNode, ...translate)
}