const fs = require("fs");
const path = require("path");
const archiver = require("archiver");
let puppeteer = null;
try {
    puppeteer = require("puppeteer");
}
catch (e) {
    /* optional dep */
}
class ReportService {
    constructor(logger) {
        this.logger = logger;
        this.outputDir = path.join(process.cwd(), "uploads", "reports");
        fs.mkdirSync(this.outputDir, { recursive: true });
    }
    async generateHTMLReport({ investigationId, title, findings, evidence, metadata, }) {
        const now = new Date();
        const safeTitle = (title || `investigation-${investigationId || "general"}`).replace(/[^a-z0-9-_]+/gi, "-");
        const filename = `${safeTitle}-${now.toISOString().slice(0, 19).replace(/[:T]/g, "-")}.html`;
        const filePath = path.join(this.outputDir, filename);
        const html = this.renderHTML({
            investigationId,
            title: title || "Investigation Report",
            findings,
            evidence,
            metadata,
            generatedAt: now.toISOString(),
        });
        fs.writeFileSync(filePath, html, "utf-8");
        this.logger && this.logger.info("Report generated", { filePath });
        const url = `/uploads/reports/${filename}`;
        return { filename, url, path: filePath, contentType: "text/html" };
    }
    async generatePDFReport({ investigationId, title, findings, evidence, metadata, }) {
        if (!puppeteer) {
            throw new Error("Puppeteer not installed on server. Run npm install to enable PDF export.");
        }
        const htmlRes = await this.generateHTMLReport({
            investigationId,
            title,
            findings,
            evidence,
            metadata,
        });
        const pdfName = htmlRes.filename.replace(/\.html$/, ".pdf");
        const pdfPath = path.join(this.outputDir, pdfName);
        const browser = await puppeteer.launch({
            args: ["--no-sandbox", "--disable-setuid-sandbox"],
        });
        try {
            const page = await browser.newPage();
            await page.goto("file://" + htmlRes.path, { waitUntil: "networkidle0" });
            await page.pdf({ path: pdfPath, format: "A4", printBackground: true });
        }
        finally {
            await browser.close();
        }
        const url = `/uploads/reports/${pdfName}`;
        return {
            filename: pdfName,
            url,
            path: pdfPath,
            contentType: "application/pdf",
            source: htmlRes,
        };
    }
    async generateMarkdownReport({ investigationId, title, findings, evidence, metadata, }) {
        const now = new Date();
        const safeTitle = (title || `investigation-${investigationId || "general"}`).replace(/[^a-z0-9-_]+/gi, "-");
        const filename = `${safeTitle}-${now
            .toISOString()
            .slice(0, 19)
            .replace(/[:T]/g, "-")}.md`;
        const filePath = path.join(this.outputDir, filename);
        const markdown = this.renderMarkdown({
            investigationId,
            title: title || "Investigation Report",
            findings,
            evidence,
            metadata,
            generatedAt: now.toISOString(),
        });
        fs.writeFileSync(filePath, markdown, "utf-8");
        this.logger && this.logger.info("Markdown report generated", { filePath });
        const url = `/uploads/reports/${filename}`;
        return { filename, url, path: filePath, contentType: "text/markdown" };
    }
    async zipFiles(items, zipBasename) {
        const zipName = zipBasename.endsWith(".zip")
            ? zipBasename
            : `${zipBasename}.zip`;
        const zipPath = path.join(this.outputDir, zipName);
        await new Promise((resolve, reject) => {
            const output = fs.createWriteStream(zipPath);
            const archive = archiver("zip", { zlib: { level: 9 } });
            output.on("close", resolve);
            archive.on("error", reject);
            archive.pipe(output);
            items.forEach((it) => {
                if (it.path) {
                    archive.file(it.path, { name: it.name || path.basename(it.path) });
                }
                else if (it.content !== undefined) {
                    archive.append(it.content, { name: it.name });
                }
            });
            archive.finalize();
        });
        const url = `/uploads/reports/${zipName}`;
        return {
            filename: zipName,
            url,
            path: zipPath,
            contentType: "application/zip",
        };
    }
    async generate({ investigationId, title, findings, evidence, metadata, format = "html", zip = false, }) {
        let primary;
        if (format === "pdf")
            primary = await this.generatePDFReport({
                investigationId,
                title,
                findings,
                evidence,
                metadata,
            });
        else if (format === "md" || format === "markdown")
            primary = await this.generateMarkdownReport({
                investigationId,
                title,
                findings,
                evidence,
                metadata,
            });
        else
            primary = await this.generateHTMLReport({
                investigationId,
                title,
                findings,
                evidence,
                metadata,
            });
        if (!zip)
            return primary;
        const json = JSON.stringify({
            investigationId,
            title,
            findings,
            evidence,
            metadata,
            generatedAt: new Date().toISOString(),
        }, null, 2);
        const csvHeader = "section,value\n";
        const csvFindings = (findings || [])
            .map((f) => `finding,${JSON.stringify(String(f))}`)
            .join("\n");
        const csvEvidence = (evidence || [])
            .map((e) => `evidence,${JSON.stringify(String(e))}`)
            .join("\n");
        const csv = csvHeader +
            csvFindings +
            (csvFindings && csvEvidence ? "\n" : "") +
            csvEvidence +
            "\n";
        const items = [];
        if (primary.contentType === "application/pdf" && primary.source)
            items.push({ path: primary.source.path });
        items.push({ path: primary.path });
        items.push({ name: "report.json", content: json });
        items.push({ name: "report.csv", content: csv });
        const zipRes = await this.zipFiles(items, (title || "report") + "-" + Date.now());
        return { ...zipRes, items: [primary] };
    }
    renderHTML({ investigationId, title, findings = [], evidence = [], metadata = {}, generatedAt, }) {
        const esc = (s) => String(s || "").replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]);
        const items = (arr) => arr.map((x) => `<li>${esc(x)}</li>`).join("\n");
        return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${esc(title)}</title>
  <style>
    body { font-family: -apple-system, Segoe UI, Roboto, sans-serif; margin: 2rem; }
    h1, h2 { margin-top: 1.5rem; }
    .meta { color: #555; font-size: 0.9rem; }
    .section { margin-bottom: 1.5rem; }
    .evidence li, .findings li { margin-bottom: 0.25rem; }
    code { background: #f6f8fa; padding: 2px 4px; border-radius: 4px; }
  </style>
  </head>
<body>
  <h1>${esc(title)}</h1>
  <div class="meta">Generated: ${esc(generatedAt)}${investigationId ? ` • Investigation: ${esc(investigationId)}` : ""}</div>
  <div class="section summary">
    <h2>Summary</h2>
    <ul>
      <li>Total Findings: ${findings.length}</li>
      <li>Total Evidence: ${evidence.length}</li>
    </ul>
  </div>
  <div class="section findings">
    <h2>Findings</h2>
    <ul>
      ${items(findings)}
    </ul>
  </div>
  <div class="section evidence">
    <h2>Evidence</h2>
    <ul>
      ${items(evidence)}
    </ul>
  </div>
  <div class="section">
    <h2>Metadata</h2>
    <pre>${esc(JSON.stringify(metadata || {}, null, 2))}</pre>
  </div>
</body>
</html>`;
    }
    renderMarkdown({ investigationId, title, findings = [], evidence = [], metadata = {}, generatedAt, }) {
        const esc = (s) => String(s || "");
        const items = (arr) => arr.map((x) => `- ${esc(x)}`).join("\n");
        return `# ${esc(title)}\n\nGenerated: ${esc(generatedAt)}$${investigationId ? `\nInvestigation: ${esc(investigationId)}` : ""}\n\n## Summary\n\n- Total Findings: ${findings.length}\n- Total Evidence: ${evidence.length}\n\n## Findings\n${items(findings)}\n\n## Evidence\n${items(evidence)}\n\n## Metadata\n\n\`\`\`json\n${esc(JSON.stringify(metadata || {}, null, 2))}\n\`\`\`\n`;
    }
}
module.exports = ReportService;
//# sourceMappingURL=ReportService.js.map