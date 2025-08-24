FROM python:3.12
WORKDIR /app
COPY pyproject.toml .
RUN pip install .
COPY src src
CMD ["python","-c","print('ingestors ready')"]
