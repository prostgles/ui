FROM postgis/postgis:17-3.6-alpine

# Switch to root user to install packages
USER root

# procps needed for stat monitoring
RUN apk add --no-cache procps

# Switch back to the default postgres user
USER postgres
