const fs = require("fs");
const ReportService = require("../services/ReportService");
describe("ReportService", () => {
    let svc;
    beforeEach(() => {
        svc = new ReportService();
    });
    test("generates markdown report with summary counts", async () => {
        const res = await svc.generate({
            investigationId: "test",
            title: "Test Report",
            findings: ["A", "B"],
            evidence: ["E1"],
            metadata: { env: "test" },
            format: "md",
        });
        expect(res.filename.endsWith(".md")).toBe(true);
        const content = fs.readFileSync(res.path, "utf-8");
        expect(content).toContain("# Test Report");
        expect(content).toContain("Total Findings: 2");
        expect(content).toContain("Total Evidence: 1");
        // cleanup
        fs.unlinkSync(res.path);
    });
});
//# sourceMappingURL=reportService.test.js.map