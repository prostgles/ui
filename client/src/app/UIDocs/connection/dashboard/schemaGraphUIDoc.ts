import type { UIDocElement } from "src/app/UIDocs";

export const schemaGraphUIDoc = {
  type: "popup",
  selectorCommand: "SchemaGraph",
  title: "Schema diagram",
  description:
    "Opens the schema diagram for visualizing the relationships between tables in the current database.",
  docs: `
        Explore your database structure visually through the schema diagram. This tool lets you:
        - **Select schemas** — Choose one or multiple schemas to display
        - **Navigate freely** — Pan and zoom to focus on specific areas
        - **View table relationships** — See how tables connect through foreign keys
        - **Filter your view** — Show or hide tables and columns by relationship type
        - **Color links by root table** — Trace relationships back to their source at a glance. Links inherit the color of the table that defines the relationship (e.g., all user_id foreign keys match the users table color)
        - **Reset the layout** — Return to the default view which auto-arranges tables ensuring the most linked tables are central

        It allows you to explore the schema structure, view table relationships, and manage the layout of the schema diagram.
        You can pan and zoom the diagram, select schemas, filter tables and columns based on their relationship types, reset the layout.
        Link color modes allow you to better understand related tables and foreign key properties.
        
        <img src="./screenshots/schema_diagram.svgif.svg" alt="Schema diagram screenshot" />

        ## Controls
      `,
  docOptions: "asSeparateFile",
  childrenTitle: "Top controls",
  // componentName: "SchemaGraph", // The popup title controls need refactoring to ensure this works
  children: [
    {
      type: "select",
      selectorCommand: "SchemaGraph.TopControls.tableRelationsFilter",
      title: "Table relationship filter",
      description:
        "Display tables based on their relationship type. Options include: all, linked (with relationships), orphaned (without relationships).",
    },
    {
      type: "select",
      selectorCommand: "SchemaGraph.TopControls.columnRelationsFilter",
      title: "Column relationship filter",
      description:
        "Display columns based on their relationship type. Options include: all, references (with relationships), none (no columns/only table names will be shown).",
    },
    {
      type: "select",
      title: "Link colour mode",
      selectorCommand: "SchemaGraph.TopControls.linkColorMode",
      description:
        "Colour links by: default (fixed colour), root table (the colour of the table the relationship tree originates from), on-delete/on-update (colour based on constraint referential action).",
    },
    {
      type: "button",
      selectorCommand: "SchemaGraph.TopControls.resetLayout",
      title: "Reset layout",
      description:
        "Moving tables is persisted the state database. Clicking this resets the schema diagram layout to its initial state.",
    },
    {
      type: "button",
      selectorCommand: "Popup.close",
      title: "Close schema diagram",
      description:
        "Closes the schema diagram and returns to the dashboard menu.",
    },
  ],
} satisfies UIDocElement;
