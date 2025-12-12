FROM searxng/searxng:latest

# Copy custom settings file
COPY settings.yml /etc/searxng/settings.yml

# Set proper permissions
USER root
RUN chown -R searxng:searxng /etc/searxng/settings.yml
USER searxng