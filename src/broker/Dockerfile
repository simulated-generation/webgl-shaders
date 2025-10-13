# broker/Dockerfile
FROM python:3.11-slim

# small working dir
WORKDIR /app

# keep Python output unbuffered
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    HOST=0.0.0.0 \
    PORT=8000 \
    LOG_DIR=/logs

# install deps
COPY requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt

# copy code
COPY . /app

# create logs dir with permissive perms (mounted by compose)
RUN mkdir -p /logs && chown -R 1000:1000 /logs || true

# drop to non-root user for safety
RUN useradd -u 1000 -m appuser || true
USER appuser

EXPOSE 8000

# use uvicorn directly
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000", "--ws", "websockets", "--loop", "asyncio"]

