/**
 * Visualization Service Tests - P2 Priority
 * Comprehensive test suite for advanced visualization engine
 */
const VisualizationService = require('../services/VisualizationService');
describe('Visualization Service - P2 Priority', () => {
    let visualizationService;
    let mockNeo4jDriver;
    let mockMultimodalService;
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
        mockMultimodalService = {
            getEntityMediaContent: jest.fn(),
            generateEntityThumbnail: jest.fn()
        };
        mockLogger = {
            info: jest.fn(),
            error: jest.fn(),
            warn: jest.fn()
        };
        visualizationService = new VisualizationService(mockNeo4jDriver, mockMultimodalService, mockLogger);
        // Mock methods called in constructor
        // visualizationService.initializeVisualizationTypes = jest.fn();
        visualizationService.initializeRenderingEngines = jest.fn();
        visualizationService.initializeLayoutAlgorithms = jest.fn();
        visualizationService.initializeStyleThemes = jest.fn();
        visualizationService.initializeInteractionHandlers = jest.fn();
        visualizationService.initializeTemplates = jest.fn();
    });
    afterEach(() => {
        jest.clearAllMocks();
    });
    describe('Visualization Engine Initialization', () => {
        test('should initialize all supported visualization types', () => {
            const types = visualizationService.getSupportedVisualizationTypes();
            expect(types).toHaveLength(10);
            expect(types.map(t => t.id)).toContain('NETWORK_GRAPH');
            expect(types.map(t => t.id)).toContain('TIMELINE_VIEW');
            expect(types.map(t => t.id)).toContain('GEOSPATIAL_MAP');
            expect(types.map(t => t.id)).toContain('HIERARCHICAL_TREE');
            expect(types.map(t => t.id)).toContain('MATRIX_VIEW');
            expect(types.map(t => t.id)).toContain('SANKEY_DIAGRAM');
            expect(types.map(t => t.id)).toContain('CHORD_DIAGRAM');
            expect(types.map(t => t.id)).toContain('FORCE_DIRECTED_3D');
            expect(types.map(t => t.id)).toContain('HEATMAP_OVERLAY');
            expect(types.map(t => t.id)).toContain('CUSTOM_DASHBOARD');
        });
        test('should configure rendering engines correctly', () => {
            const engines = visualizationService.getSupportedRenderingEngines();
            expect(engines.map(e => e.id)).toContain('CYTOSCAPE');
            expect(engines.map(e => e.id)).toContain('D3');
            expect(engines.map(e => e.id)).toContain('THREEJS');
            expect(engines.map(e => e.id)).toContain('LEAFLET');
            expect(engines.map(e => e.id)).toContain('PLOTLY');
            expect(engines.map(e => e.id)).toContain('CANVAS');
            const cytoscapeEngine = engines.find(e => e.id === 'CYTOSCAPE');
            expect(cytoscapeEngine.capabilities).toContain('network_graphs');
            expect(cytoscapeEngine.capabilities).toContain('interactive_layouts');
        });
        test('should validate engine-type compatibility', () => {
            const networkType = visualizationService.getVisualizationType('NETWORK_GRAPH');
            expect(networkType.compatibleEngines).toContain('CYTOSCAPE');
            expect(networkType.compatibleEngines).toContain('D3');
            const timelineType = visualizationService.getVisualizationType('TIMELINE_VIEW');
            expect(timelineType.compatibleEngines).toContain('D3');
            expect(timelineType.compatibleEngines).toContain('PLOTLY');
        });
    });
    describe('Visualization Creation', () => {
        test('should create network graph visualizations', async () => {
            // Mock graph data
            mockSession.run
                .mockResolvedValueOnce({
                records: [
                    { get: () => ({ properties: { id: 'n1', label: 'Node 1', type: 'PERSON' } }) },
                    { get: () => ({ properties: { id: 'n2', label: 'Node 2', type: 'ORGANIZATION' } }) }
                ]
            })
                .mockResolvedValueOnce({
                records: [
                    {
                        get: (field) => {
                            if (field === 'source')
                                return { properties: { id: 'n1' } };
                            if (field === 'target')
                                return { properties: { id: 'n2' } };
                            if (field === 'relationship')
                                return { properties: { type: 'WORKS_FOR', weight: 0.8 } };
                        }
                    }
                ]
            });
            const visualizationRequest = {
                type: 'NETWORK_GRAPH',
                engine: 'CYTOSCAPE',
                investigationId: 'inv123',
                parameters: {
                    layout: 'cose',
                    showLabels: true,
                    nodeSize: 'centrality',
                    edgeThickness: 'weight'
                },
                userId: 'analyst123'
            };
            const visualization = await visualizationService.createVisualization(visualizationRequest);
            expect(visualization.id).toBeDefined();
            expect(visualization.type).toBe('NETWORK_GRAPH');
            expect(visualization.engine).toBe('CYTOSCAPE');
            expect(visualization.data.nodes).toHaveLength(2);
            expect(visualization.data.edges).toHaveLength(1);
            expect(visualization.config.layout).toBe('cose');
        });
        test('should create timeline visualizations', async () => {
            mockSession.run.mockResolvedValue({
                records: [
                    {
                        get: () => ({
                            properties: {
                                id: 'event1',
                                timestamp: new Date('2024-01-01'),
                                event_type: 'COMMUNICATION',
                                description: 'Phone call between entities'
                            }
                        })
                    }
                ]
            });
            const visualizationRequest = {
                type: 'TIMELINE_VIEW',
                engine: 'D3',
                investigationId: 'inv123',
                parameters: {
                    timeRange: { start: '2024-01-01', end: '2024-12-31' },
                    groupBy: 'event_type',
                    showDetails: true
                },
                userId: 'analyst123'
            };
            const visualization = await visualizationService.createVisualization(visualizationRequest);
            expect(visualization.type).toBe('TIMELINE_VIEW');
            expect(visualization.data.events).toHaveLength(1);
            expect(visualization.data.events[0].timestamp).toBeInstanceOf(Date);
            expect(visualization.config.timeRange).toBeDefined();
        });
        test('should create geospatial map visualizations', async () => {
            mockSession.run.mockResolvedValue({
                records: [
                    {
                        get: () => ({
                            properties: {
                                id: 'loc1',
                                latitude: 40.7128,
                                longitude: -74.0060,
                                label: 'New York Office',
                                entity_type: 'LOCATION'
                            }
                        })
                    }
                ]
            });
            const visualizationRequest = {
                type: 'GEOSPATIAL_MAP',
                engine: 'LEAFLET',
                investigationId: 'inv123',
                parameters: {
                    mapStyle: 'satellite',
                    clusterPoints: true,
                    showHeatmap: false
                },
                userId: 'analyst123'
            };
            const visualization = await visualizationService.createVisualization(visualizationRequest);
            expect(visualization.type).toBe('GEOSPATIAL_MAP');
            expect(visualization.data.locations).toHaveLength(1);
            expect(visualization.data.locations[0].coordinates).toEqual([40.7128, -74.0060]);
            expect(visualization.config.mapStyle).toBe('satellite');
        });
        test('should create hierarchical tree visualizations', async () => {
            mockSession.run.mockResolvedValue({
                records: [
                    {
                        get: (field) => {
                            if (field === 'parent')
                                return { properties: { id: 'root', label: 'Root Node' } };
                            if (field === 'child')
                                return { properties: { id: 'child1', label: 'Child 1' } };
                            if (field === 'depth')
                                return 1;
                        }
                    }
                ]
            });
            const visualizationRequest = {
                type: 'HIERARCHICAL_TREE',
                engine: 'D3',
                entityId: 'root_entity',
                parameters: {
                    maxDepth: 3,
                    expandAll: false,
                    orientation: 'vertical'
                },
                userId: 'analyst123'
            };
            const visualization = await visualizationService.createVisualization(visualizationRequest);
            expect(visualization.type).toBe('HIERARCHICAL_TREE');
            expect(visualization.data.hierarchy).toBeDefined();
            expect(visualization.config.maxDepth).toBe(3);
        });
    });
    describe('Advanced Visualization Types', () => {
        test('should create matrix visualizations', async () => {
            const mockMatrixData = [
                [0.8, 0.3, 0.1],
                [0.3, 0.9, 0.4],
                [0.1, 0.4, 0.7]
            ];
            mockSession.run.mockResolvedValue({
                records: mockMatrixData.map((row, i) => ({
                    get: (field) => {
                        if (field === 'row_entity')
                            return `entity${i}`;
                        if (field === 'col_entity')
                            return `entity${field.split('_')[2] || 0}`;
                        if (field === 'value')
                            return row[field.split('_')[2] || 0];
                    }
                }))
            });
            const visualizationRequest = {
                type: 'MATRIX_VIEW',
                engine: 'PLOTLY',
                investigationId: 'inv123',
                parameters: {
                    metric: 'similarity',
                    colorScale: 'viridis',
                    showValues: true
                },
                userId: 'analyst123'
            };
            const visualization = await visualizationService.createVisualization(visualizationRequest);
            expect(visualization.type).toBe('MATRIX_VIEW');
            expect(visualization.data.matrix).toBeDefined();
            expect(visualization.config.colorScale).toBe('viridis');
        });
        test('should create Sankey diagram visualizations', async () => {
            mockSession.run.mockResolvedValue({
                records: [
                    {
                        get: (field) => {
                            if (field === 'source')
                                return 'Source A';
                            if (field === 'target')
                                return 'Target B';
                            if (field === 'value')
                                return 50;
                        }
                    }
                ]
            });
            const visualizationRequest = {
                type: 'SANKEY_DIAGRAM',
                engine: 'D3',
                investigationId: 'inv123',
                parameters: {
                    flowMetric: 'transaction_volume',
                    nodeAlignment: 'left',
                    iterations: 32
                },
                userId: 'analyst123'
            };
            const visualization = await visualizationService.createVisualization(visualizationRequest);
            expect(visualization.type).toBe('SANKEY_DIAGRAM');
            expect(visualization.data.flows).toBeDefined();
            expect(visualization.config.flowMetric).toBe('transaction_volume');
        });
        test('should create 3D force-directed visualizations', async () => {
            mockSession.run
                .mockResolvedValueOnce({
                records: [
                    { get: () => ({ properties: { id: 'n1', label: 'Node 1', type: 'PERSON' } }) }
                ]
            })
                .mockResolvedValueOnce({
                records: [
                    {
                        get: (field) => {
                            if (field === 'source')
                                return { properties: { id: 'n1' } };
                            if (field === 'target')
                                return { properties: { id: 'n2' } };
                            if (field === 'relationship')
                                return { properties: { type: 'CONNECTED' } };
                        }
                    }
                ]
            });
            const visualizationRequest = {
                type: 'FORCE_DIRECTED_3D',
                engine: 'THREEJS',
                investigationId: 'inv123',
                parameters: {
                    physics: {
                        strength: -300,
                        distance: 100,
                        decay: 0.4
                    },
                    camera: {
                        position: [0, 0, 300],
                        lookAt: [0, 0, 0]
                    }
                },
                userId: 'analyst123'
            };
            const visualization = await visualizationService.createVisualization(visualizationRequest);
            expect(visualization.type).toBe('FORCE_DIRECTED_3D');
            expect(visualization.engine).toBe('THREEJS');
            expect(visualization.config.physics).toBeDefined();
            expect(visualization.config.camera).toBeDefined();
        });
    });
    describe('Interactive Features', () => {
        test('should handle node selection and highlighting', async () => {
            const visualization = {
                id: 'viz123',
                type: 'NETWORK_GRAPH',
                data: {
                    nodes: [
                        { id: 'n1', label: 'Node 1' },
                        { id: 'n2', label: 'Node 2' }
                    ],
                    edges: [
                        { source: 'n1', target: 'n2' }
                    ]
                }
            };
            visualizationService.visualizations.set('viz123', visualization);
            const result = await visualizationService.selectNode('viz123', 'n1', 'user123');
            expect(result.success).toBe(true);
            expect(result.selectedNode).toBe('n1');
            expect(result.highlightedNodes).toContain('n1');
            expect(result.highlightedNodes).toContain('n2'); // Connected node
        });
        test('should support node filtering and search', async () => {
            const visualization = {
                id: 'viz123',
                data: {
                    nodes: [
                        { id: 'n1', label: 'Alice Smith', type: 'PERSON' },
                        { id: 'n2', label: 'Bob Jones', type: 'PERSON' },
                        { id: 'n3', label: 'Acme Corp', type: 'ORGANIZATION' }
                    ]
                }
            };
            visualizationService.visualizations.set('viz123', visualization);
            const filterResult = await visualizationService.applyNodeFilter('viz123', {
                type: 'PERSON',
                labelContains: 'Smith'
            });
            expect(filterResult.visibleNodes).toEqual(['n1']);
            expect(filterResult.hiddenNodes).toEqual(['n2', 'n3']);
        });
        test('should handle layout changes', async () => {
            const visualization = {
                id: 'viz123',
                type: 'NETWORK_GRAPH',
                config: { layout: 'grid' }
            };
            visualizationService.visualizations.set('viz123', visualization);
            const result = await visualizationService.changeLayout('viz123', 'force-directed', {
                iterations: 100,
                linkDistance: 50
            });
            expect(result.success).toBe(true);
            expect(result.newLayout).toBe('force-directed');
            expect(result.layoutConfig.iterations).toBe(100);
        });
        test('should support zoom and pan operations', async () => {
            const visualization = {
                id: 'viz123',
                viewport: { zoom: 1.0, x: 0, y: 0 }
            };
            visualizationService.visualizations.set('viz123', visualization);
            const result = await visualizationService.updateViewport('viz123', {
                zoom: 2.0,
                x: 100,
                y: 50
            });
            expect(result.success).toBe(true);
            expect(result.viewport.zoom).toBe(2.0);
            expect(result.viewport.x).toBe(100);
            expect(result.viewport.y).toBe(50);
        });
    });
    describe('Export Functionality', () => {
        test('should export visualizations to PNG format', async () => {
            const visualization = {
                id: 'viz123',
                type: 'NETWORK_GRAPH',
                engine: 'CYTOSCAPE'
            };
            // Mock canvas operations
            const mockCanvas = {
                toBuffer: jest.fn().mockReturnValue(Buffer.from('png data')),
                toDataURL: jest.fn().mockReturnValue('data:image/png;base64,iVBOR...')
            };
            visualizationService.createCanvas = jest.fn().mockReturnValue(mockCanvas);
            visualizationService.visualizations.set('viz123', visualization);
            const exportResult = await visualizationService.exportVisualization('viz123', {
                format: 'png',
                width: 1200,
                height: 800,
                quality: 0.9
            });
            expect(exportResult.format).toBe('png');
            expect(exportResult.buffer).toBeInstanceOf(Buffer);
            expect(exportResult.width).toBe(1200);
            expect(exportResult.height).toBe(800);
        });
        test('should export visualizations to SVG format', async () => {
            const visualization = {
                id: 'viz123',
                type: 'NETWORK_GRAPH'
            };
            visualizationService.visualizations.set('viz123', visualization);
            const exportResult = await visualizationService.exportVisualization('viz123', {
                format: 'svg',
                includeCSS: true,
                embedFonts: true
            });
            expect(exportResult.format).toBe('svg');
            expect(exportResult.svg).toContain('<svg');
            expect(exportResult.svg).toContain('</svg>');
        });
        test('should export visualizations to JSON format', async () => {
            const visualization = {
                id: 'viz123',
                type: 'NETWORK_GRAPH',
                data: {
                    nodes: [{ id: 'n1', label: 'Node 1' }],
                    edges: []
                },
                config: { layout: 'cose' }
            };
            visualizationService.visualizations.set('viz123', visualization);
            const exportResult = await visualizationService.exportVisualization('viz123', {
                format: 'json',
                includeConfig: true,
                includeMetadata: true
            });
            expect(exportResult.format).toBe('json');
            const jsonData = JSON.parse(exportResult.json);
            expect(jsonData.data.nodes).toHaveLength(1);
            expect(jsonData.config.layout).toBe('cose');
        });
        test('should export interactive HTML visualizations', async () => {
            const visualization = {
                id: 'viz123',
                type: 'NETWORK_GRAPH',
                engine: 'D3'
            };
            visualizationService.visualizations.set('viz123', visualization);
            const exportResult = await visualizationService.exportVisualization('viz123', {
                format: 'html',
                includeInteractivity: true,
                includeControls: true
            });
            expect(exportResult.format).toBe('html');
            expect(exportResult.html).toContain('<!DOCTYPE html>');
            expect(exportResult.html).toContain('<script');
            expect(exportResult.html).toContain('d3.js');
        });
    });
    describe('Layout Algorithms', () => {
        test('should implement force-directed layout', () => {
            const nodes = [
                { id: 'n1', x: 0, y: 0 },
                { id: 'n2', x: 100, y: 100 },
                { id: 'n3', x: 200, y: 0 }
            ];
            const edges = [
                { source: 'n1', target: 'n2' },
                { source: 'n2', target: 'n3' }
            ];
            const layout = visualizationService.calculateForceDirectedLayout({ nodes, edges }, {
                iterations: 50,
                linkDistance: 100,
                nodeStrength: -300
            });
            expect(layout).toBeDefined();
            expect(Object.keys(layout)).toHaveLength(3);
            expect(layout.n1).toHaveProperty('x');
            expect(layout.n1).toHaveProperty('y');
        });
        test('should implement hierarchical layout', () => {
            const nodes = [
                { id: 'root', level: 0 },
                { id: 'child1', level: 1, parent: 'root' },
                { id: 'child2', level: 1, parent: 'root' },
                { id: 'grandchild1', level: 2, parent: 'child1' }
            ];
            const layout = visualizationService.calculateHierarchicalLayout(nodes, {
                direction: 'vertical',
                levelSpacing: 100,
                nodeSpacing: 80
            });
            expect(layout.root.y).toBe(0);
            expect(layout.child1.y).toBe(100);
            expect(layout.child2.y).toBe(100);
            expect(layout.grandchild1.y).toBe(200);
        });
        test('should implement circular layout', () => {
            const nodes = [
                { id: 'n1' },
                { id: 'n2' },
                { id: 'n3' },
                { id: 'n4' }
            ];
            const layout = visualizationService.calculateCircularLayout(nodes, {
                radius: 200,
                startAngle: 0
            });
            expect(Object.keys(layout)).toHaveLength(4);
            // Verify nodes are positioned in a circle
            const distances = Object.values(layout).map(pos => Math.sqrt(pos.x * pos.x + pos.y * pos.y));
            distances.forEach(distance => {
                expect(distance).toBeCloseTo(200, 1);
            });
        });
        test('should implement grid layout', () => {
            const nodes = Array(9).fill().map((_, i) => ({ id: `n${i}` }));
            const layout = visualizationService.calculateGridLayout(nodes, {
                columns: 3,
                cellWidth: 100,
                cellHeight: 100
            });
            expect(Object.keys(layout)).toHaveLength(9);
            expect(layout.n0).toEqual({ x: 0, y: 0 });
            expect(layout.n1).toEqual({ x: 100, y: 0 });
            expect(layout.n3).toEqual({ x: 0, y: 100 });
        });
    });
    describe('Real-time Updates', () => {
        test('should handle real-time node additions', async () => {
            const visualization = {
                id: 'viz123',
                data: {
                    nodes: [{ id: 'n1', label: 'Node 1' }],
                    edges: []
                }
            };
            visualizationService.visualizations.set('viz123', visualization);
            const result = await visualizationService.addNode('viz123', {
                id: 'n2',
                label: 'Node 2',
                type: 'PERSON'
            });
            expect(result.success).toBe(true);
            expect(visualization.data.nodes).toHaveLength(2);
            expect(visualization.data.nodes[1].id).toBe('n2');
        });
        test('should handle real-time edge additions', async () => {
            const visualization = {
                id: 'viz123',
                data: {
                    nodes: [
                        { id: 'n1', label: 'Node 1' },
                        { id: 'n2', label: 'Node 2' }
                    ],
                    edges: []
                }
            };
            visualizationService.visualizations.set('viz123', visualization);
            const result = await visualizationService.addEdge('viz123', {
                source: 'n1',
                target: 'n2',
                type: 'CONNECTED_TO',
                weight: 0.8
            });
            expect(result.success).toBe(true);
            expect(visualization.data.edges).toHaveLength(1);
            expect(visualization.data.edges[0].source).toBe('n1');
        });
        test('should handle node property updates', async () => {
            const visualization = {
                id: 'viz123',
                data: {
                    nodes: [{ id: 'n1', label: 'Old Label', risk: 0.3 }],
                    edges: []
                }
            };
            visualizationService.visualizations.set('viz123', visualization);
            const result = await visualizationService.updateNodeProperties('viz123', 'n1', {
                label: 'New Label',
                risk: 0.8,
                color: '#ff0000'
            });
            expect(result.success).toBe(true);
            expect(visualization.data.nodes[0].label).toBe('New Label');
            expect(visualization.data.nodes[0].risk).toBe(0.8);
            expect(visualization.data.nodes[0].color).toBe('#ff0000');
        });
    });
    describe('Performance Optimization', () => {
        test('should implement level-of-detail rendering', () => {
            const viewport = { zoom: 0.5, bounds: { x1: 0, y1: 0, x2: 1000, y2: 800 } };
            const nodes = Array(10000).fill().map((_, i) => ({
                id: `n${i}`,
                x: Math.random() * 2000,
                y: Math.random() * 1600,
                size: Math.random() * 20 + 5
            }));
            const optimized = visualizationService.applyLevelOfDetail(nodes, viewport);
            expect(optimized.visible.length).toBeLessThan(nodes.length);
            expect(optimized.simplified.length).toBeGreaterThan(0);
            expect(optimized.hidden.length).toBeGreaterThan(0);
        });
        test('should implement node clustering for large graphs', () => {
            const nodes = Array(5000).fill().map((_, i) => ({
                id: `n${i}`,
                x: Math.random() * 1000,
                y: Math.random() * 1000,
                type: i % 3 === 0 ? 'PERSON' : i % 3 === 1 ? 'ORGANIZATION' : 'LOCATION'
            }));
            const clusters = visualizationService.clusterNodes(nodes, {
                maxClusterSize: 50,
                clusterDistance: 100
            });
            expect(clusters.length).toBeGreaterThan(0);
            expect(clusters.length).toBeLessThan(nodes.length);
            clusters.forEach(cluster => {
                expect(cluster.nodes.length).toBeLessThanOrEqual(50);
                expect(cluster.centroid).toBeDefined();
            });
        });
        test('should implement edge bundling for complex networks', () => {
            const edges = Array(1000).fill().map((_, i) => ({
                source: `n${i % 100}`,
                target: `n${(i + 1) % 100}`,
                weight: Math.random()
            }));
            const bundled = visualizationService.bundleEdges(edges, {
                bundleStrength: 0.8,
                subdivisions: 3
            });
            expect(bundled.bundles.length).toBeLessThan(edges.length);
            expect(bundled.controlPoints).toBeDefined();
        });
    });
    describe('Visualization Management', () => {
        test('should save and load visualization configurations', async () => {
            const visualization = {
                id: 'viz123',
                type: 'NETWORK_GRAPH',
                config: { layout: 'cose', theme: 'dark' }
            };
            const saved = await visualizationService.saveVisualization(visualization, 'user123');
            expect(saved.success).toBe(true);
            expect(saved.id).toBeDefined();
            const loaded = await visualizationService.loadVisualization(saved.id, 'user123');
            expect(loaded.config.layout).toBe('cose');
            expect(loaded.config.theme).toBe('dark');
        });
        test('should share visualizations between users', async () => {
            const visualization = { id: 'viz123', userId: 'user1' };
            visualizationService.visualizations.set('viz123', visualization);
            const result = await visualizationService.shareVisualization('viz123', 'user1', ['user2', 'user3'], {
                permissions: ['view', 'interact'],
                expiration: new Date(Date.now() + 24 * 60 * 60 * 1000)
            });
            expect(result.success).toBe(true);
            expect(result.shareId).toBeDefined();
            expect(result.sharedWith).toEqual(['user2', 'user3']);
        });
        test('should create visualization snapshots', async () => {
            const visualization = {
                id: 'viz123',
                data: { nodes: [], edges: [] },
                config: { layout: 'cose' },
                viewport: { zoom: 1.5, x: 100, y: 200 }
            };
            const snapshot = await visualizationService.createSnapshot('viz123', 'user123', {
                name: 'Investigation Milestone',
                description: 'Network state at key investigation point'
            });
            expect(snapshot.id).toBeDefined();
            expect(snapshot.name).toBe('Investigation Milestone');
            expect(snapshot.visualizationState).toBeDefined();
            expect(snapshot.createdAt).toBeInstanceOf(Date);
        });
    });
    describe('Metrics and Analytics', () => {
        test('should track visualization usage metrics', () => {
            const metrics = visualizationService.getMetrics();
            expect(metrics.totalVisualizations).toBeGreaterThanOrEqual(0);
            expect(metrics.activeVisualizations).toBeGreaterThanOrEqual(0);
            expect(metrics.typeBreakdown).toBeDefined();
            expect(metrics.engineBreakdown).toBeDefined();
            expect(metrics.averageRenderTime).toBeGreaterThanOrEqual(0);
        });
        test('should provide performance analytics', () => {
            // Simulate rendering operations
            visualizationService.recordRenderTime('NETWORK_GRAPH', 1200);
            visualizationService.recordRenderTime('TIMELINE_VIEW', 800);
            visualizationService.recordRenderTime('NETWORK_GRAPH', 1100);
            const analytics = visualizationService.getPerformanceAnalytics();
            expect(analytics.averageRenderTimes.NETWORK_GRAPH).toBeCloseTo(1150);
            expect(analytics.averageRenderTimes.TIMELINE_VIEW).toBe(800);
            expect(analytics.totalRenders).toBe(3);
        });
    });
    describe('Error Handling', () => {
        test('should handle data loading failures gracefully', async () => {
            mockSession.run.mockRejectedValue(new Error('Database connection failed'));
            const visualizationRequest = {
                type: 'NETWORK_GRAPH',
                investigationId: 'inv123',
                userId: 'analyst123'
            };
            const result = await visualizationService.createVisualization(visualizationRequest);
            expect(result.success).toBe(false);
            expect(result.error).toContain('Database connection failed');
            expect(mockLogger.error).toHaveBeenCalled();
        });
        test('should validate visualization parameters', async () => {
            const invalidRequest = {
                type: 'INVALID_TYPE',
                engine: 'UNKNOWN_ENGINE',
                parameters: { invalidParam: true }
            };
            await expect(visualizationService.createVisualization(invalidRequest))
                .rejects.toThrow('Invalid visualization type');
        });
    });
});
// Performance tests
describe('Visualization Service Performance', () => {
    let visualizationService;
    beforeEach(() => {
        visualizationService = new VisualizationService({ session: () => ({ run: jest.fn(), close: jest.fn() }) }, { getEntityMediaContent: jest.fn() }, { info: jest.fn(), error: jest.fn() });
    });
    test('should handle large graph rendering efficiently', async () => {
        const largeGraph = {
            nodes: Array(10000).fill().map((_, i) => ({
                id: `node${i}`,
                label: `Node ${i}`,
                x: Math.random() * 1000,
                y: Math.random() * 1000
            })),
            edges: Array(15000).fill().map((_, i) => ({
                source: `node${i % 10000}`,
                target: `node${(i + 1) % 10000}`
            }))
        };
        const startTime = Date.now();
        const layout = await visualizationService.calculateForceDirectedLayout(largeGraph);
        const duration = Date.now() - startTime;
        expect(duration).toBeLessThan(15000); // Should complete within 15 seconds
        expect(Object.keys(layout)).toHaveLength(10000);
    });
});
//# sourceMappingURL=visualizationService.test.js.map