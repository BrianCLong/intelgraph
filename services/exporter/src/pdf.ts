import { PDFDocument, StandardFonts, rgb, PDFHexString } from 'pdf-lib';

export const createPdf = async (
  entitiesLen: number,
  edgesLen: number,
): Promise<Buffer> => {
  const pdfDoc = await PDFDocument.create();
  const fixedDate = new Date('2000-01-01T00:00:00Z');
  pdfDoc.setCreationDate(fixedDate);
  pdfDoc.setModificationDate(fixedDate);
  const id = pdfDoc.context.obj([
    PDFHexString.fromText('0000000000000000'),
    PDFHexString.fromText('0000000000000000'),
  ]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (pdfDoc.context.trailerInfo as any).ID = id;
  const page = pdfDoc.addPage();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const { height } = page.getSize();
  const text = `Graph Snapshot\nEntities: ${entitiesLen}\nEdges: ${edgesLen}`;
  page.drawText(text, {
    x: 50,
    y: height - 50,
    size: 12,
    font,
    color: rgb(0, 0, 0),
  });
  const pdfBytes = await pdfDoc.save({ useObjectStreams: false });
  return Buffer.from(pdfBytes);
};
