FROM python:3.12-slim AS base
WORKDIR /app
COPY .. /app
RUN pip install .
EXPOSE 8090
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8090", "--timeout-keep-alive", "5", "--limit-concurrency", "100"]
