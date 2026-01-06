FROM searxng/searxng:latest

# Copy custom settings file
COPY settings.yml /etc/searxng/settings.yml
COPY limiter.toml /etc/searxng/limiter.toml

# Set proper permissions
USER root
RUN chown -R searxng:searxng /etc/searxng/settings.yml
RUN chown -R searxng:searxng /etc/searxng/limiter.toml
USER searxng