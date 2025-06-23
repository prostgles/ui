import type { UIDoc } from "../UIDocs";

export const UIInstallation = {
  title: "Installation",
  type: "info",
  description: "A guide to help you get started with the application.",
  docs: `
    The recommended way to run Prostgles UI is by using the Docker:
 
    Download the source code:

    \`\`\`bash
    git clone https://github.com/prostgles/ui.git
    cd ui
    \`\`\`

    Start the application:

    \`\`\`docker-compose.sh
    docker compose up -d
    \`\`\` 
    
    Once running, the app will be accessible at [localhost:3004](http://localhost:3004)

    ### Initial Setup & Authentication

    When first launching Prostgles UI, an admin user will be created automatically:
    - If \`PRGL_USERNAME\` and \`PRGL_PASSWORD\` environment variables are provided, an admin user is created with these credentials. 
    - Otherwise, a passwordless admin user is created. 
    It gets assigned to the first client that accesses the app. 
    Subsequent clients accessing the app will be rejected with an appropriate error message detailing that the passwordless admin user has already been assigned.

    To setup multiple users, the passwordless admin user must be converted to a normal admin account by setting up a password.
    This will allow accessing /users page where you can manage users.

    Users login using their username and password. Two-factor authentication is provided through TOTP (Time-based One-Time Password) and can be enabled in the account section.

    Email and third-party (OAuth) authentication can be configured in Server Settings section. It allows users to register and log in using their email address or third-party accounts like Google, GitHub, etc.
   
    `,
} satisfies UIDoc;
