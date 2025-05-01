/**
  Create a single html file that accomplishes the following task:
  Create a cable like effect for a database schema diagram drawing using d3. 

  Each table is a rectangle with a name and a list of columns.
  Links lines are drawn between tables that have foreign keys.

  To achieve a cable-like effect split each link with nodes every 30px that will:
  0) attract link nodes from the same link (meaning they will follow the shortest path)
  1) attract link nodes from the same table  (meaning the will try be near each other like pipework)
  2) repel all tables within a distance of 30px (meaning they go around the tables)
  2) repel link nodes from other tables within a distance of 30px (meaning they go around the tables)

  Draw a smooth line through those link nodes. (the link nodes are not visible and only used for simulation)
  
  Dragging tables should only move links and not other tables
  Once positioned, tables should not move unless dragged.
 




write a ts simulation function that takes the following parameters:

rectangles: { id: string; x: number; y: number; w: number; h: number }
links: { id: string; x: number; y: number; sourceId: string; targetId: string } 

It should then 



 */
