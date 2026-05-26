FROM searxng/searxng:latest

# Copy custom settings file
COPY settings.yml /etc/searxng/settings.yml
COPY limiter.toml /etc/searxng/limiter.toml

# Set proper permissions
USER root
RUN update-ca-certificates
RUN chown searxng:searxng /etc/searxng/settings.yml
RUN chown searxng:searxng /etc/searxng/limiter.toml
USER searxng