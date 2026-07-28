# Stage 1: Grab Keycloak 26.7.0
FROM quay.io/keycloak/keycloak:26.7.0 AS keycloak-base

# Stage 2: Ubuntu 24.04 (has Java 21 natively)
FROM ubuntu:24.04

# Install Java 21, Node.js, npm, and netcat
RUN apt-get update && \
  apt-get install -y curl ca-certificates openjdk-21-jre-headless netcat-traditional && \
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash - && \
  apt-get install -y nodejs && \
  rm -rf /var/lib/apt/lists/*

# Copy Keycloak from the official image
COPY --from=keycloak-base /opt/keycloak /opt/keycloak

WORKDIR /app

# Install TS and MCP SDK dependencies
RUN npm init -y && \
  npm install express @modelcontextprotocol/sdk typescript tsx @types/express

# Copy your server and execution script
COPY server.ts start-mock-mcp.sh ./
RUN chmod +x start-mock-mcp.sh

EXPOSE 8080 3000
CMD ["./start-mock-mcp.sh"]