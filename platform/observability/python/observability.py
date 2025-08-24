import logging
from logging.config import dictConfig
from prometheus_client import start_http_server
from opentelemetry import trace, metrics
from opentelemetry.sdk.resources import Resource
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor, ConsoleSpanExporter
from opentelemetry.sdk.metrics import MeterProvider

logger = logging.getLogger("observability")


def setup(service_name: str = "intelgraph-service", metrics_port: int = 9464) -> None:
    dictConfig(
        {
            "version": 1,
            "formatters": {"default": {"format": "%(levelname)s %(name)s %(message)s"}},
            "handlers": {"stdout": {"class": "logging.StreamHandler", "formatter": "default"}},
            "root": {"handlers": ["stdout"], "level": "INFO"},
        }
    )

    def redact(record: logging.LogRecord) -> bool:
        if record.args:
            record.args = tuple("***" if k in {"password", "ssn"} else k for k in record.args)
        return True

    logging.getLogger().addFilter(redact)
    start_http_server(metrics_port)

    resource = Resource.create({"service.name": service_name})
    tracer_provider = TracerProvider(resource=resource)
    tracer_provider.add_span_processor(BatchSpanProcessor(ConsoleSpanExporter()))
    trace.set_tracer_provider(tracer_provider)

    meter_provider = MeterProvider(resource=resource)
    metrics.set_meter_provider(meter_provider)
    logger.info("observability initialized", extra={"service": service_name})
