import { fixIndent } from "../../demo/sqlVideoDemo";
import type { UIDoc } from "../UIDocs";

export const gettingStarted = {
  title: "Getting Started",
  type: "section",
  selector: "",
  description: "A guide to help you get started with the application.",
  children: [],
  docs: fixIndent(`
    Prostgles UI is a comprehensive database administration and analytics tool for PostgreSQL. It provides a web-based interface for managing connections, executing queries, visualizing data, and collaborating with team members.
    
    ## Quick Start

    1. **First Launch**: When accessing Prostgles UI for the first time, you'll automatically become the admin user
    2. **Add a Connection**: Navigate to Connections and click "New Connection" to connect to your PostgreSQL database
    3. **Explore Your Data**: Use the Dashboard menu to browse tables, execute SQL queries, and create visualizations
    4. **Create Workspaces**: Organize your work by creating dedicated workspaces for different projects

    ## Key Features

    - **Multi-database Management**: Connect to multiple PostgreSQL instances
    - **Real-time Collaboration**: Share workspaces and collaborate with team members
    - **Advanced Visualizations**: Create maps (requires PostGIS) and time-series charts
    - **AI-Powered Assistance**: Generate SQL queries and get schema insights with the built-in AI assistant
    - **Flexible Security**: Fine-grained access control and authentication options
    `),
} satisfies UIDoc;
