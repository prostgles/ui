import { getSchemaTableColY, type SchemaGraphState } from "./SchemaGraph";
import * as d3 from "d3";

type GraphParams = { 
  svgNode: SVGElement; 
  data: { nodes: SchemaGraphState["nodes"]; links: SchemaGraphState["links"] };
  onClickNode: (id: string) => any
}
export const drawSchema = (args: GraphParams) => {
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

  data.nodes.forEach(n => {
    n.x = n.hasLinks?  width/2 : 0;
    n.y = n.hasLinks?  height/2 : 0;
    n.fy = n.x;
    n.fx = n.y;
  });


  // Add encompassing group for the zoom
  const g = svg.select("g.everything"),
    gLinks = g.select("g.links"),
    gNodes = g.select("g.nodes");

  const linkSel = gLinks
    .selectAll("path.link")
    .data(data.links, (d => d.id) );

  const link = linkSel.enter()
    .append("path")
      .attr("class", "link")
      .attr("stroke-width", 2)
      .attr("fill", "none")
      .attr("stroke", d => d.color)
      .merge(linkSel );
      
  linkSel.exit().remove();

  const nodeSel = gNodes.selectAll("g.node")
    .data(data.nodes, (d => d.id) );

  const node = nodeSel
    .enter()
      .append("g")
      .attr("class", "node")  
      .merge(nodeSel );

  nodeSel.exit().remove();

  // node.on("click", function(e, d) { 
  //   onClickNode(d.id)
  // });

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
        .attr("y", (d, i) => getSchemaTableColY(i, height) )
        .text(text => text.label)
        .style("dominant-baseline", "hanging")
        .style("fill", (d, i) => d.color)
        .style("font-size", (d, i) => ( !i? 18 : 14))
        // .each((d, i, nodes)=> {
        //   const node = d3.select(this)
        //   console.log(nodes[i].getBBox())
        // });
    });

  // startSimulation(node);

  // const drag_handler = 

  node.call(d3.drag()
  .on("drag", function(e, d){
    d.x = e.x;
    d.y = e.y;
    console.log(d.x, d.y)
    d3.select(this)
    .attr("x", d.x)
    .attr("y", d.y);
  }));


  // Zoom functions
  function zoom_actions(event){
    g.attr("transform", event.transform)
  }
  // Add zoom capabilities
  const zoom_handler = d3.zoom()
    .on("zoom", zoom_actions);
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

}

