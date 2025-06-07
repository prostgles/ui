import type { UIDoc } from "../UIDocs";

export const overviewUIDoc = {
  type: "info",
  title: "Overview",
  description: "Overview",
  docs: `
    Prostgles UI is a powerful and user-friendly interface designed for creating internal tools as well as managing PostgreSQL databases.

    It comes in two versions: 

    ### 1. Prostgles UI 
    
    Web-based application accessible through any modern browser with a complete feature set:
    - User authentication and authorization
    - Multi-user collaboration
    - Role-based access control
    - Advanced dashboard creation
    - Real-time data synchronization
    - Database management
    
    ### 2. Prostgles Desktop 
    
    Native desktop application for Linux, MacOS and Windows. 
    It has a subset of the core features from Prostgles UI for data exploration and database management. 
    Authentication, User Management, File storage and other features are not available in the desktop version.
 
  `,
  asSeparateFile: true,
} as const satisfies UIDoc;
