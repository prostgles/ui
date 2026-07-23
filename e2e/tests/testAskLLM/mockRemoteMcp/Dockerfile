# Stage 1: Grab Keycloak 26.7.0
FROM quay.io/keycloak/keycloak:26.7.0 AS keycloak-base

# Stage 2: Ubuntu 24.04 (has Java 21 natively)
FROM ubuntu:24.04

# Install Java 21, Node.js, npm, and netcat
RUN apt-get update && \
  apt-get install -y \
  openjdk-21-jre-headless \
  nodejs \
  npm \
  netcat-traditional && \
  rm -rf /var/lib/apt/lists/*

# Copy Keycloak from the official image
COPY --from=keycloak-base /opt/keycloak /opt/keycloak

WORKDIR /app

# Install TS and MCP SDK dependencies
RUN npm init -y && \
  npm install express @modelcontextprotocol/sdk typescript tsx @types/express

# Copy your server and execution script
COPY server.ts start.sh ./
RUN chmod +x start.sh

EXPOSE 8080 3000
CMD ["./start.sh"]