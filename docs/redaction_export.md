# Redaction and Export

PII spans are redacted using `pikepdf` overlays for vector PDFs or Pillow for raster images. A watermark is added during export along with a provenance manifest. Bundles include the redacted PDF and structured JSON describing blocks, tables and entities.
