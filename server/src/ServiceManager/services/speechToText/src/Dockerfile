# FROM nvidia/cuda:12.2.0-runtime-ubuntu22.04
ARG BASE_IMAGE=python:3.11-slim
FROM ${BASE_IMAGE}

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update -y && apt-get install -y \
    ffmpeg \
    python3-pip \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better caching
COPY requirements.txt .

# Install Python dependencies
RUN pip3 install --no-cache-dir -r requirements.txt

# Copy application files
COPY app.py .
COPY templates/ templates/

# Expose port
EXPOSE 8000

# Set environment variables
ENV PYTHONUNBUFFERED=1
ENV NVIDIA_VISIBLE_DEVICES=all
ENV NVIDIA_DRIVER_CAPABILITIES=compute,utility

# Run the application
CMD ["python3", "app.py"]