FROM python:3.12
WORKDIR /app
COPY pyproject.toml .
RUN pip install .
COPY src src
CMD ["uvicorn","finintel.main:app","--host","0.0.0.0","--port","8000"]
