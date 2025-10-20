FROM postgis/postgis:17-3.4

# Switch to root user to install packages
USER root

# procps needed for stat monitoring
RUN apt-get update && apt-get install -y procps && \
    rm -rf /var/lib/apt/lists/*

# Switch back to the default postgres user
USER postgres 