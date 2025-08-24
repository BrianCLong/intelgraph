# OCR and Layout

PDFs are parsed using `pdfplumber` to extract text spans and geometry. Images fall back to Tesseract via `pytesseract` with deterministic settings. Layout blocks are grouped with heuristic rules from `layoutparser` producing paragraphs, headings and tables.
