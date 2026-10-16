FROM postgis/postgis:17-3.6-alpine

# Switch to root user to install packages
USER root

# procps needed for stat monitoring
RUN apk add --no-cache procps

# The entrypoint fixes volume ownership as root, then starts PostgreSQL as postgres.
