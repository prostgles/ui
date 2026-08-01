# Use the official docling-serve image (CPU version by default)
# For GPU support, the service config will override with cu128 image 
ARG BASE_IMAGE=quay.io/docling-project/docling-serve:v1.29.0
FROM ${BASE_IMAGE}

# Expose the default port
EXPOSE 5001

# Set environment variables
ENV DOCLING_SERVE_HOST=0.0.0.0
ENV DOCLING_SERVE_PORT=5001
ENV DOCLING_SERVE_ENABLE_UI=1
ENV PYTHONUNBUFFERED=1

# Health check
# HEALTHCHECK --interval=30s --timeout=30s --start-period=60s --retries=3 \
#   CMD curl -f http://localhost:5001/health || exit 1

# Run docling-serve
CMD ["docling-serve", "run"]
