# Use the official docling-serve image (CPU version by default)
# For GPU support, the service config will override with cu128 image 
ARG BASE_IMAGE=quay.io/docling-project/docling-serve:v1.32.0
FROM ${BASE_IMAGE}

EXPOSE 5001

ENV DOCLING_SERVE_HOST=0.0.0.0
ENV DOCLING_SERVE_PORT=5001
ENV DOCLING_SERVE_ENABLE_UI=1
ENV PYTHONUNBUFFERED=1

USER root

COPY patch_layout_postprocessor.py ./patch_layout_postprocessor.py
RUN python patch_layout_postprocessor.py && rm patch_layout_postprocessor.py

CMD ["docling-serve", "run"]
