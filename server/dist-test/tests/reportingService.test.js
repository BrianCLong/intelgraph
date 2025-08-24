/**
 * Reporting Service Tests - P1 Priority
 * Comprehensive test suite for advanced reporting and export system
 */
const ReportingService = require('../services/ReportingService');
describe('Reporting Service - P1 Priority', () => {
    let reportingService;
    let mockNeo4jDriver;
    let mockVisualizationService;
    let mockNotificationService;
    let mockLogger;
    let mockSession;
    beforeEach(() => {
        mockSession = {
            run: jest.fn(),
            close: jest.fn()
        };
        mockNeo4jDriver = {
            session: jest.fn(() => mockSession)
        };
        mockVisualizationService = {
            createVisualization: jest.fn(),
            exportVisualization: jest.fn()
        };
        mockNotificationService = {
            sendNotification: jest.fn()
        };
        mockLogger = {
            info: jest.fn(),
            error: jest.fn(),
            warn: jest.fn()
        };
        reportingService = new ReportingService(mockNeo4jDriver, mockVisualizationService, mockNotificationService, mockLogger);
    });
    afterEach(() => {
        jest.clearAllMocks();
    });
    describe('Report Template Management', () => {
        test('should initialize all required report templates', () => {
            const templates = reportingService.getAvailableTemplates();
            expect(templates).toHaveLength(6);
            expect(templates.map(t => t.id)).toContain('INVESTIGATION_SUMMARY');
            expect(templates.map(t => t.id)).toContain('ENTITY_ANALYSIS');
            expect(templates.map(t => t.id)).toContain('NETWORK_ANALYSIS');
            expect(templates.map(t => t.id)).toContain('SECURITY_ASSESSMENT');
            expect(templates.map(t => t.id)).toContain('ANALYTICS_REPORT');
            expect(templates.map(t => t.id)).toContain('COMPLIANCE_REPORT');
        });
        test('should configure template metadata correctly', () => {
            const templates = reportingService.getAvailableTemplates();
            const investigationTemplate = templates.find(t => t.id === 'INVESTIGATION_SUMMARY');
            expect(investigationTemplate.name).toBe('Investigation Summary Report');
            expect(investigationTemplate.description).toContain('comprehensive overview');
            expect(investigationTemplate.sections.length).toBeGreaterThan(5);
            expect(investigationTemplate.exportFormats).toContain('pdf');
            expect(investigationTemplate.exportFormats).toContain('docx');
        });
        test('should validate template sections and parameters', () => {
            const templates = reportingService.getAvailableTemplates();
            const networkTemplate = templates.find(t => t.id === 'NETWORK_ANALYSIS');
            expect(networkTemplate.sections).toContain('network_topology');
            expect(networkTemplate.sections).toContain('centrality_analysis');
            expect(networkTemplate.sections).toContain('community_detection');
            expect(networkTemplate.parameters.includeVisualization).toBe(true);
        });
    });
    describe('Report Generation', () => {
        test('should generate comprehensive investigation report', async () => {
            // Mock data queries
            mockSession.run
                .mockResolvedValueOnce({
                records: [{
                        get: () => ({
                            properties: {
                                id: 'inv123',
                                title: 'Test Investigation',
                                status: 'ACTIVE',
                                created_at: new Date(),
                                entity_count: 25,
                                relationship_count: 45
                            }
                        })
                    }]
            })
                .mockResolvedValueOnce({
                records: [
                    { get: () => ({ properties: { id: 'ent1', label: 'Entity 1', type: 'PERSON' } }) },
                    { get: () => ({ properties: { id: 'ent2', label: 'Entity 2', type: 'ORGANIZATION' } }) }
                ]
            })
                .mockResolvedValueOnce({
                records: [
                    { get: () => ({ properties: { type: 'ASSOCIATED_WITH', weight: 0.8 } }) }
                ]
            });
            const reportRequest = {
                templateId: 'INVESTIGATION_SUMMARY',
                investigationId: 'inv123',
                parameters: {
                    includeVisualization: true,
                    includeAnalytics: true,
                    exportFormat: 'pdf'
                },
                userId: 'analyst123'
            };
            const report = await reportingService.generateReport(reportRequest);
            expect(report.id).toBeDefined();
            expect(report.templateId).toBe('INVESTIGATION_SUMMARY');
            expect(report.status).toBe('GENERATING');
            expect(report.sections).toBeDefined();
            expect(mockSession.run).toHaveBeenCalledTimes(3);
        });
        test('should handle entity analysis reports', async () => {
            mockSession.run.mockResolvedValue({
                records: [{
                        get: () => ({
                            properties: {
                                id: 'ent123',
                                label: 'Test Entity',
                                type: 'PERSON',
                                risk_score: 0.75,
                                connection_count: 15
                            }
                        })
                    }]
            });
            const reportRequest = {
                templateId: 'ENTITY_ANALYSIS',
                entityId: 'ent123',
                parameters: {
                    includeConnections: true,
                    includeRiskAnalysis: true
                },
                userId: 'analyst123'
            };
            const report = await reportingService.generateReport(reportRequest);
            expect(report.templateId).toBe('ENTITY_ANALYSIS');
            expect(report.data.entity).toBeDefined();
            expect(report.data.entity.risk_score).toBe(0.75);
        });
        test('should generate network analysis reports', async () => {
            mockSession.run.mockResolvedValue({
                records: [
                    { get: (field) => field === 'nodeId' ? 'node1' : field === 'degree' ? 5 : 0.8 }
                ]
            });
            const reportRequest = {
                templateId: 'NETWORK_ANALYSIS',
                investigationId: 'inv123',
                parameters: {
                    analysisType: 'centrality',
                    includeVisualization: true
                },
                userId: 'analyst123'
            };
            const report = await reportingService.generateReport(reportRequest);
            expect(report.templateId).toBe('NETWORK_ANALYSIS');
            expect(report.data.networkMetrics).toBeDefined();
        });
    });
    describe('Export Format Support', () => {
        test('should export reports to PDF format', async () => {
            const mockPDFDocument = {
                fontSize: jest.fn().mockReturnThis(),
                text: jest.fn().mockReturnThis(),
                addPage: jest.fn().mockReturnThis(),
                pipe: jest.fn(),
                end: jest.fn()
            };
            // Mock PDF library
            const PDFDocument = jest.fn(() => mockPDFDocument);
            reportingService.PDFDocument = PDFDocument;
            const report = {
                id: 'report123',
                templateId: 'INVESTIGATION_SUMMARY',
                title: 'Test Investigation Report',
                sections: {
                    executive_summary: { content: 'Executive summary content' },
                    findings: { content: 'Key findings content' }
                }
            };
            const exportResult = await reportingService.exportToPDF(report);
            expect(exportResult.format).toBe('pdf');
            expect(exportResult.filename).toContain('.pdf');
            expect(mockPDFDocument.text).toHaveBeenCalledWith(expect.stringContaining('Test Investigation Report'), expect.any(Object));
        });
        test('should export reports to DOCX format', async () => {
            const mockDocx = {
                Document: jest.fn(),
                Paragraph: jest.fn(),
                TextRun: jest.fn(),
                Packer: {
                    toBuffer: jest.fn().mockResolvedValue(Buffer.from('docx content'))
                }
            };
            reportingService.docx = mockDocx;
            const report = {
                id: 'report123',
                title: 'Test Report',
                sections: {
                    summary: { content: 'Report summary' }
                }
            };
            const exportResult = await reportingService.exportToDOCX(report);
            expect(exportResult.format).toBe('docx');
            expect(exportResult.buffer).toBeInstanceOf(Buffer);
            expect(exportResult.buffer.length).toBeGreaterThan(0);
            expect(mockDocx.Document).toHaveBeenCalled();
        });
        test('should export reports to HTML format', async () => {
            const report = {
                id: 'report123',
                title: 'Test HTML Report',
                sections: {
                    overview: {
                        title: 'Overview',
                        content: 'This is the overview section'
                    },
                    details: {
                        title: 'Details',
                        content: 'Detailed analysis goes here'
                    }
                },
                metadata: {
                    generatedAt: new Date(),
                    author: 'Test Analyst'
                }
            };
            const exportResult = await reportingService.exportToHTML(report);
            expect(exportResult.format).toBe('html');
            expect(exportResult.html).toContain('<!DOCTYPE html>');
            expect(exportResult.html).toContain('Test HTML Report');
            expect(exportResult.html).toContain('Overview');
            expect(exportResult.html).toContain('This is the overview section');
            expect(exportResult.css).toBeDefined();
        });
        test('should export reports to JSON format', async () => {
            const report = {
                id: 'report123',
                title: 'Test JSON Report',
                data: { entities: 5, relationships: 10 }
            };
            const exportResult = await reportingService.exportToJSON(report);
            expect(exportResult.format).toBe('json');
            expect(JSON.parse(exportResult.json).id).toBe('report123');
            expect(JSON.parse(exportResult.json).data.entities).toBe(5);
        });
        test('should export reports to CSV format', async () => {
            const report = {
                id: 'report123',
                data: {
                    entities: [
                        { id: 'ent1', label: 'Entity 1', type: 'PERSON' },
                        { id: 'ent2', label: 'Entity 2', type: 'ORGANIZATION' }
                    ]
                }
            };
            const exportResult = await reportingService.exportToCSV(report);
            expect(exportResult.format).toBe('csv');
            expect(exportResult.csv).toContain('id,label,type');
            expect(exportResult.csv).toContain('ent1,Entity 1,PERSON');
            expect(exportResult.csv).toContain('ent2,Entity 2,ORGANIZATION');
        });
        test('should export reports to Excel format', async () => {
            const mockWorkbook = {
                addWorksheet: jest.fn().mockReturnValue({
                    addRow: jest.fn(),
                    getRow: jest.fn().mockReturnValue({ font: {} }),
                    columns: []
                }),
                xlsx: {
                    writeBuffer: jest.fn().mockResolvedValue(Buffer.from('excel content'))
                }
            };
            reportingService.ExcelJS = { Workbook: jest.fn(() => mockWorkbook) };
            const report = {
                data: {
                    entities: [
                        { id: 'ent1', label: 'Entity 1', type: 'PERSON' }
                    ]
                }
            };
            const exportResult = await reportingService.exportToExcel(report);
            expect(exportResult.format).toBe('xlsx');
            expect(exportResult.buffer).toBeInstanceOf(Buffer);
            expect(mockWorkbook.addWorksheet).toHaveBeenCalledWith('Entities');
        });
    });
    describe('Advanced Export Formats', () => {
        test('should export reports to PowerPoint format', async () => {
            const mockPresentation = {
                addSlide: jest.fn().mockReturnValue({
                    addText: jest.fn(),
                    addChart: jest.fn(),
                    addImage: jest.fn()
                }),
                writeFile: jest.fn().mockResolvedValue(Buffer.from('pptx content'))
            };
            reportingService.PptxGenJS = { Presentation: jest.fn(() => mockPresentation) };
            const report = {
                title: 'Investigation Presentation',
                sections: {
                    overview: { title: 'Overview', content: 'Investigation overview' },
                    findings: { title: 'Key Findings', content: 'Important findings' }
                }
            };
            const exportResult = await reportingService.exportToPowerPoint(report);
            expect(exportResult.format).toBe('pptx');
            expect(mockPresentation.addSlide).toHaveBeenCalledTimes(3); // Title + 2 sections
        });
        test('should export reports to Gephi format', async () => {
            const report = {
                data: {
                    nodes: [
                        { id: 'node1', label: 'Node 1', type: 'PERSON' },
                        { id: 'node2', label: 'Node 2', type: 'ORGANIZATION' }
                    ],
                    edges: [
                        { source: 'node1', target: 'node2', weight: 0.8 }
                    ]
                }
            };
            const exportResult = await reportingService.exportToGephi(report);
            expect(exportResult.format).toBe('gexf');
            expect(exportResult.gexf).toContain('<?xml version="1.0"');
            expect(exportResult.gexf).toContain('<gexf');
            expect(exportResult.gexf).toContain('node1');
            expect(exportResult.gexf).toContain('Node 1');
        });
    });
    describe('Report Scheduling', () => {
        test('should create scheduled reports', async () => {
            const scheduleData = {
                name: 'Weekly Security Report',
                templateId: 'SECURITY_ASSESSMENT',
                schedule: '0 9 * * 1', // Every Monday at 9 AM
                parameters: {
                    timeframe: 'last_week',
                    includeVisualization: true
                },
                recipients: ['security_team@example.com'],
                exportFormat: 'pdf',
                userId: 'admin123'
            };
            const scheduledReport = await reportingService.createScheduledReport(scheduleData);
            expect(scheduledReport.id).toBeDefined();
            expect(scheduledReport.name).toBe('Weekly Security Report');
            expect(scheduledReport.schedule).toBe('0 9 * * 1');
            expect(scheduledReport.status).toBe('ACTIVE');
            expect(scheduledReport.nextRun).toBeInstanceOf(Date);
        });
        test('should execute scheduled reports', async () => {
            const scheduledReport = {
                id: 'sched123',
                templateId: 'COMPLIANCE_REPORT',
                parameters: { timeframe: 'monthly' },
                exportFormat: 'pdf',
                recipients: ['compliance@example.com']
            };
            mockSession.run.mockResolvedValue({
                records: [{ get: () => ({ properties: { compliance_score: 0.95 } }) }]
            });
            mockNotificationService.sendNotification.mockResolvedValue({ id: 'notif123' });
            const result = await reportingService.executeScheduledReport(scheduledReport);
            expect(result.success).toBe(true);
            expect(result.reportId).toBeDefined();
            expect(mockNotificationService.sendNotification).toHaveBeenCalledWith(expect.objectContaining({
                templateId: 'DATA_EXPORT_READY',
                recipients: ['compliance@example.com']
            }));
        });
        test('should handle scheduled report failures gracefully', async () => {
            const scheduledReport = {
                id: 'sched123',
                templateId: 'INVALID_TEMPLATE'
            };
            const result = await reportingService.executeScheduledReport(scheduledReport);
            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
            expect(mockLogger.error).toHaveBeenCalled();
        });
    });
    describe('Report Templates and Customization', () => {
        test('should allow custom template creation', async () => {
            const templateData = {
                name: 'Custom Investigation Template',
                description: 'Custom template for specific investigation types',
                sections: ['header', 'summary', 'findings', 'recommendations'],
                parameters: {
                    includeTimeline: true,
                    includeRiskAssessment: true
                },
                exportFormats: ['pdf', 'docx'],
                userId: 'analyst123'
            };
            const template = await reportingService.createCustomTemplate(templateData);
            expect(template.id).toBeDefined();
            expect(template.name).toBe('Custom Investigation Template');
            expect(template.sections).toEqual(['header', 'summary', 'findings', 'recommendations']);
            expect(template.type).toBe('CUSTOM');
        });
        test('should validate template configurations', async () => {
            const invalidTemplate = {
                name: '', // Missing name
                sections: [], // No sections
                exportFormats: ['invalid_format']
            };
            await expect(reportingService.createCustomTemplate(invalidTemplate))
                .rejects.toThrow('Template validation failed');
        });
        test('should support template inheritance', async () => {
            const baseTemplateId = 'INVESTIGATION_SUMMARY';
            const customization = {
                name: 'Extended Investigation Report',
                additionalSections: ['risk_analysis', 'recommendations'],
                parameters: {
                    includeAdvancedAnalytics: true
                }
            };
            const template = await reportingService.extendTemplate(baseTemplateId, customization);
            expect(template.parentTemplateId).toBe(baseTemplateId);
            expect(template.sections).toContain('risk_analysis');
            expect(template.sections).toContain('recommendations');
        });
    });
    describe('Data Processing and Analysis', () => {
        test('should process complex investigation data', async () => {
            const investigationData = {
                investigation: { id: 'inv123', title: 'Test Investigation' },
                entities: [
                    { id: 'ent1', label: 'Person A', type: 'PERSON', risk_score: 0.8 },
                    { id: 'ent2', label: 'Org B', type: 'ORGANIZATION', risk_score: 0.6 }
                ],
                relationships: [
                    { source: 'ent1', target: 'ent2', type: 'EMPLOYED_BY', weight: 0.9 }
                ]
            };
            const processed = await reportingService.processInvestigationData(investigationData);
            expect(processed.summary.entityCount).toBe(2);
            expect(processed.summary.relationshipCount).toBe(1);
            expect(processed.summary.averageRiskScore).toBe(0.7);
            expect(processed.keyFindings).toBeDefined();
            expect(processed.riskAssessment).toBeDefined();
        });
        test('should calculate network metrics for reports', async () => {
            const networkData = {
                nodes: [
                    { id: 'n1', connections: 3 },
                    { id: 'n2', connections: 5 },
                    { id: 'n3', connections: 2 }
                ],
                edges: [
                    { source: 'n1', target: 'n2' },
                    { source: 'n2', target: 'n3' }
                ]
            };
            const metrics = await reportingService.calculateNetworkMetrics(networkData);
            expect(metrics.nodeCount).toBe(3);
            expect(metrics.edgeCount).toBe(2);
            expect(metrics.averageDegree).toBeCloseTo(3.33, 2);
            expect(metrics.density).toBeDefined();
            expect(metrics.centralityMeasures).toBeDefined();
        });
    });
    describe('Report Management', () => {
        test('should list user reports with filtering', async () => {
            const mockReports = [
                {
                    id: 'report1',
                    templateId: 'INVESTIGATION_SUMMARY',
                    status: 'COMPLETED',
                    created_at: new Date(),
                    user_id: 'user123'
                },
                {
                    id: 'report2',
                    templateId: 'ENTITY_ANALYSIS',
                    status: 'GENERATING',
                    created_at: new Date(),
                    user_id: 'user123'
                }
            ];
            reportingService.reports = new Map([
                ['report1', mockReports[0]],
                ['report2', mockReports[1]]
            ]);
            const reports = reportingService.getUserReports('user123', {
                status: 'COMPLETED',
                templateId: 'INVESTIGATION_SUMMARY'
            });
            expect(reports).toHaveLength(1);
            expect(reports[0].id).toBe('report1');
        });
        test('should delete reports and cleanup files', async () => {
            const report = {
                id: 'report123',
                filePath: '/tmp/report123.pdf',
                userId: 'user123'
            };
            reportingService.reports.set('report123', report);
            // Mock file system operations
            const mockFS = {
                unlink: jest.fn().mockResolvedValue(true)
            };
            reportingService.fs = mockFS;
            const result = await reportingService.deleteReport('report123', 'user123');
            expect(result).toBe(true);
            expect(reportingService.reports.has('report123')).toBe(false);
            expect(mockFS.unlink).toHaveBeenCalledWith('/tmp/report123.pdf');
        });
        test('should get report download URLs', async () => {
            const report = {
                id: 'report123',
                filePath: '/tmp/report123.pdf',
                userId: 'user123',
                status: 'COMPLETED'
            };
            reportingService.reports.set('report123', report);
            const downloadUrl = await reportingService.getDownloadUrl('report123', 'user123');
            expect(downloadUrl).toBeDefined();
            expect(downloadUrl).toContain('report123');
            expect(downloadUrl).toContain('download');
        });
    });
    describe('Metrics and Analytics', () => {
        test('should track reporting metrics', () => {
            const metrics = reportingService.getMetrics();
            expect(metrics.totalReports).toBeGreaterThanOrEqual(0);
            expect(metrics.completedReports).toBeGreaterThanOrEqual(0);
            expect(metrics.failedReports).toBeGreaterThanOrEqual(0);
            expect(metrics.averageGenerationTime).toBeGreaterThanOrEqual(0);
            expect(metrics.templateBreakdown).toBeDefined();
        });
        test('should provide usage analytics', () => {
            // Simulate report generation
            reportingService.metrics.totalReports = 100;
            reportingService.metrics.completedReports = 95;
            reportingService.metrics.averageGenerationTime = 45000; // 45 seconds
            const analytics = reportingService.getUsageAnalytics();
            expect(analytics.successRate).toBe('95.00');
            expect(analytics.averageGenerationTimeMinutes).toBe(0.75);
            expect(analytics.popularTemplates).toBeDefined();
        });
    });
    describe('Error Handling and Recovery', () => {
        test('should handle data source failures gracefully', async () => {
            mockSession.run.mockRejectedValue(new Error('Database connection failed'));
            const reportRequest = {
                templateId: 'INVESTIGATION_SUMMARY',
                investigationId: 'inv123',
                userId: 'analyst123'
            };
            const report = await reportingService.generateReport(reportRequest);
            expect(report.status).toBe('FAILED');
            expect(report.error).toContain('Database connection failed');
            expect(mockLogger.error).toHaveBeenCalled();
        });
        test('should retry failed report generation', async () => {
            const report = {
                id: 'report123',
                status: 'FAILED',
                retryCount: 0,
                maxRetries: 3
            };
            reportingService.reports.set('report123', report);
            // Mock successful retry
            mockSession.run.mockResolvedValue({
                records: [{ get: () => ({ properties: { id: 'inv123' } }) }]
            });
            const result = await reportingService.retryReportGeneration('report123');
            expect(result.success).toBe(true);
            expect(report.retryCount).toBe(1);
            expect(report.status).toBe('GENERATING');
        });
    });
});
// Performance tests
describe('Reporting Service Performance', () => {
    let reportingService;
    beforeEach(() => {
        reportingService = new ReportingService({ session: () => ({ run: jest.fn(), close: jest.fn() }) }, { createVisualization: jest.fn() }, { sendNotification: jest.fn() }, { info: jest.fn(), error: jest.fn() });
    });
    test('should handle large dataset processing efficiently', async () => {
        const largeDataset = {
            entities: Array(5000).fill().map((_, i) => ({
                id: `entity${i}`,
                label: `Entity ${i}`,
                type: i % 2 === 0 ? 'PERSON' : 'ORGANIZATION'
            })),
            relationships: Array(8000).fill().map((_, i) => ({
                source: `entity${i % 5000}`,
                target: `entity${(i + 1) % 5000}`,
                type: 'CONNECTED_TO'
            }))
        };
        const startTime = Date.now();
        const processed = await reportingService.processInvestigationData({
            investigation: { id: 'large_inv', title: 'Large Investigation' },
            entities: largeDataset.entities,
            relationships: largeDataset.relationships
        });
        const duration = Date.now() - startTime;
        expect(duration).toBeLessThan(10000); // Should complete within 10 seconds
        expect(processed.summary.entityCount).toBe(5000);
        expect(processed.summary.relationshipCount).toBe(8000);
    });
});
//# sourceMappingURL=reportingService.test.js.map