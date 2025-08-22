package observability

import (
  "net/http"

  "github.com/prometheus/client_golang/prometheus/promhttp"
  "go.opentelemetry.io/otel"
  "go.opentelemetry.io/otel/sdk/resource"
  semconv "go.opentelemetry.io/otel/semconv/v1.17.0"
  "go.opentelemetry.io/otel/sdk/trace"
  stdouttrace "go.opentelemetry.io/otel/exporters/stdout/stdouttrace"
  "go.uber.org/zap"
)

// Setup configures tracing, metrics endpoint and structured logging.
func Setup(serviceName string) (*trace.TracerProvider, *zap.Logger) {
  logger, _ := zap.NewProduction()

  exporter, _ := stdouttrace.New(stdouttrace.WithPrettyPrint())
  tp := trace.NewTracerProvider(
    trace.WithBatcher(exporter),
    trace.WithResource(resource.NewWithAttributes(
      semconv.SchemaURL,
      semconv.ServiceName(serviceName),
    )),
  )
  otel.SetTracerProvider(tp)

  http.Handle("/metrics", promhttp.Handler())
  go http.ListenAndServe(":9464", nil)
  logger.Info("observability initialized", zap.String("service", serviceName))
  return tp, logger
}
