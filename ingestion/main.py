import json
import os
import time
from kafka import KafkaProducer
from kafka.errors import NoBrokersAvailable

from ingestion.ingestors import (
    RSSIngestor,
    TwitterIngestor,
    PastebinIngestor,
    STIXTAXIIIngestor,
)

print("Ingestion service starting up...")

KAFKA_BOOTSTRAP_SERVERS = os.environ.get("KAFKA_BOOTSTRAP_SERVERS", "localhost:9092")
RAW_POSTS_TOPIC = "raw.posts"

producer = None
max_attempts = 10
delay = 5

for attempt in range(max_attempts):
    try:
        print(f"Attempting to connect to Kafka (Attempt {attempt + 1}/{max_attempts})...")
        producer = KafkaProducer(
            bootstrap_servers=KAFKA_BOOTSTRAP_SERVERS.split(","),
            value_serializer=lambda v: json.dumps(v).encode("utf-8"),
        )
        producer.bootstrap_connected()
        print("Successfully connected to Kafka.")
        break
    except NoBrokersAvailable as e:
        print(f"Kafka connection failed: {e}. Retrying in {delay} seconds...")
        time.sleep(delay)
    except Exception as e:
        print(f"An unexpected error occurred during Kafka connection: {e}")
        time.sleep(delay)
else:
    raise Exception("Failed to connect to Kafka after multiple attempts.")


def main():
    ingestors = [
        RSSIngestor(producer, RAW_POSTS_TOPIC, ["https://example.com/feed"]),
        TwitterIngestor(producer, RAW_POSTS_TOPIC, api_client=None),
        PastebinIngestor(producer, RAW_POSTS_TOPIC, api_client=None),
        STIXTAXIIIngestor(
            producer,
            RAW_POSTS_TOPIC,
            "https://example.com/taxii/collections/123",
        ),
    ]

    print("Starting ingestion service...")
    while True:
        for ingestor in ingestors:
            ingestor.run()
        time.sleep(5)


if __name__ == "__main__":
    main()
