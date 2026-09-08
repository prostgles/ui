# Use the official docling-serve image (CPU version by default)
# For GPU support, the service config will override with cu128 image 
ARG BASE_IMAGE=quay.io/docling-project/docling-serve:v1.29.0
FROM ${BASE_IMAGE}

EXPOSE 5001

ENV DOCLING_SERVE_HOST=0.0.0.0
ENV DOCLING_SERVE_PORT=5001
ENV DOCLING_SERVE_ENABLE_UI=1
ENV PYTHONUNBUFFERED=1

# COPY your modified Python file into the container
# Ensure layout_postprocessor.py is in the same directory as this Dockerfile
COPY layout_postprocessor.py /tmp/layout_postprocessor.py

# Switch to root to overwrite the file (if the base image uses a non-root user)
USER root

# Dynamically locate the docling package and overwrite the file
RUN SITE_PKGS=$(python -c "import site; print(site.getsitepackages()[0])") && \
  cp /tmp/layout_postprocessor.py "$SITE_PKGS/docling/utils/layout_postprocessor.py" && \
  rm /tmp/layout_postprocessor.py

# Switch back to the default app user (docling-serve usually runs as 'app' or 'docling')
# If you run into permission errors, check the base image's default user
# USER app

CMD ["docling-serve", "run"]
