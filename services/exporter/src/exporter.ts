import JSZip from 'jszip';
import stringify from 'json-stable-stringify';
import { v5 as uuidv5 } from 'uuid';
import { applyRedactions, RedactRule } from './redact';
import { createPdf } from './pdf';
import { sha256, sortObject } from './utils';

export interface ExportRequest {
  entities: Record<string, unknown>[];
  edges: Record<string, unknown>[];
  redactRules: RedactRule[];
  format: Array<'json' | 'csv' | 'pdf'>;
}

const NAMESPACE = uuidv5.URL;
const fixedDate = new Date('2000-01-01T00:00:00Z');

const toCsv = (data: Record<string, unknown>[]): string => {
  if (data.length === 0) return '';
  const headers = Array.from(
    new Set(data.flatMap((d) => Object.keys(d))),
  ).sort();
  const escape = (val: unknown) => {
    const str = val == null ? '' : String(val);
    if (/[",\n]/.test(str)) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };
  const rows = data
    .map((row) =>
      headers.map((h) => escape((row as Record<string, unknown>)[h])),
    )
    .map((r) => r.join(','));
  return [headers.join(','), ...rows].join('\n');
};

export const createExport = async (req: ExportRequest): Promise<Buffer> => {
  const files: { path: string; content: Buffer }[] = [];
  const redactionLog: string[] = [];

  const entities = applyRedactions(req.entities, req.redactRules, redactionLog);
  const edges = applyRedactions(req.edges, req.redactRules, redactionLog);

  if (req.format.includes('json')) {
    const entStr = stringify(sortObject(entities)) as string;
    files.push({ path: 'data/entities.json', content: Buffer.from(entStr) });
    const edgeStr = stringify(sortObject(edges)) as string;
    files.push({ path: 'data/edges.json', content: Buffer.from(edgeStr) });
  }

  if (req.format.includes('csv')) {
    const entCsv = toCsv(entities);
    files.push({ path: 'data/entities.csv', content: Buffer.from(entCsv) });
    const edgeCsv = toCsv(edges);
    files.push({ path: 'data/edges.csv', content: Buffer.from(edgeCsv) });
  }

  if (req.format.includes('pdf')) {
    const pdfBuf = await createPdf(entities.length, edges.length);
    files.push({ path: 'figures/graph.pdf', content: pdfBuf });
  }

  if (redactionLog.length) {
    files.push({
      path: 'redaction.log',
      content: Buffer.from(redactionLog.join('\n')),
    });
  }

  const manifestEntries = files.map((f) => ({
    path: f.path,
    sha256: sha256(f.content),
    uuid: uuidv5(f.path, NAMESPACE),
  }));

  const manifest = {
    generatedAt: fixedDate.toISOString(),
    chainOfCustody: [{ event: 'export', timestamp: fixedDate.toISOString() }],
    files: manifestEntries.sort((a, b) => a.path.localeCompare(b.path)),
  };
  const manifestStr = stringify(manifest) as string;
  files.push({ path: 'manifest.json', content: Buffer.from(manifestStr) });

  const zip = new JSZip();
  for (const f of files.sort((a, b) => a.path.localeCompare(b.path))) {
    zip.file(f.path, f.content, { date: fixedDate });
  }
  return await zip.generateAsync({
    type: 'nodebuffer',
    compression: 'DEFLATE',
    compressionOptions: { level: 9 },
  });
};
