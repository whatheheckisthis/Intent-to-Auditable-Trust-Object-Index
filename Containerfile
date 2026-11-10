FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1
WORKDIR /app
COPY collectors/ ./collectors/
COPY ingest/ ./ingest/
COPY iato/ ./iato/
USER 10001:10001
ENTRYPOINT ["python", "-m", "iato.cli"]
