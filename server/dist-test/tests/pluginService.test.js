/**
 * Plugin Service Tests - P2 Priority
 * Comprehensive test suite for plugin architecture and extension framework
 */
const PluginService = require("../services/PluginService");
const fs = require("fs").promises;
const path = require("path");
describe("Plugin Service - P2 Priority", () => {
    let pluginService;
    let mockLogger;
    beforeEach(() => {
        mockLogger = {
            info: jest.fn(),
            error: jest.fn(),
            warn: jest.fn(),
            debug: jest.fn(),
        };
        pluginService = new PluginService(mockLogger);
    });
    afterEach(() => {
        jest.clearAllMocks();
    });
    describe("Extension Points Initialization", () => {
        test("should initialize all required extension points", () => {
            const extensionPoints = pluginService.getExtensionPoints();
            expect(extensionPoints).toHaveLength(9);
            expect(extensionPoints.map((ep) => ep.id)).toContain("ENTITY_PROCESSOR");
            expect(extensionPoints.map((ep) => ep.id)).toContain("VISUALIZATION_RENDERER");
            expect(extensionPoints.map((ep) => ep.id)).toContain("ANALYTICS_ALGORITHM");
            expect(extensionPoints.map((ep) => ep.id)).toContain("DATA_CONNECTOR");
            expect(extensionPoints.map((ep) => ep.id)).toContain("NOTIFICATION_CHANNEL");
            expect(extensionPoints.map((ep) => ep.id)).toContain("SECURITY_SCANNER");
            expect(extensionPoints.map((ep) => ep.id)).toContain("REPORT_GENERATOR");
            expect(extensionPoints.map((ep) => ep.id)).toContain("WORKFLOW_STEP");
            expect(extensionPoints.map((ep) => ep.id)).toContain("OSINT_SOURCE");
        });
        test("should configure extension point interfaces correctly", () => {
            const entityProcessor = pluginService.extensionPoints.get("ENTITY_PROCESSOR");
            expect(entityProcessor.name).toBe("Entity Processing Extension");
            expect(entityProcessor.interface.methods).toContain("processEntity");
            expect(entityProcessor.interface.methods).toContain("validateEntity");
            expect(entityProcessor.interface.methods).toContain("enrichEntity");
            expect(entityProcessor.security.permissions).toContain("ENTITY_READ");
            expect(entityProcessor.security.permissions).toContain("ENTITY_UPDATE");
        });
        test("should define security requirements for extension points", () => {
            const analyticsExtension = pluginService.extensionPoints.get("ANALYTICS_ALGORITHM");
            expect(analyticsExtension.security.permissions).toContain("ANALYTICS_RUN");
            expect(analyticsExtension.security.permissions).toContain("ML_MODEL_ACCESS");
            expect(analyticsExtension.security.dataAccess).toContain("analytics_data");
            expect(analyticsExtension.security.dataAccess).toContain("models");
        });
    });
    describe("Plugin Registration", () => {
        test("should register valid plugins successfully", async () => {
            const pluginData = {
                name: "Test Analytics Plugin",
                version: "1.0.0",
                description: "A test plugin for analytics",
                author: "Test Author",
                main: "index.js",
                extensionPoints: ["ANALYTICS_ALGORITHM"],
                hooks: ["PRE_ANALYTICS_RUN", "POST_ANALYTICS_RUN"],
                permissions: ["ANALYTICS_RUN", "ML_MODEL_ACCESS"],
                dependencies: {},
                peerDependencies: {},
                sandboxed: true,
            };
            const plugin = await pluginService.registerPlugin(pluginData);
            expect(plugin.id).toBeDefined();
            expect(plugin.name).toBe("Test Analytics Plugin");
            expect(plugin.version).toBe("1.0.0");
            expect(plugin.status).toBe("REGISTERED");
            expect(plugin.extensionPoints).toContain("ANALYTICS_ALGORITHM");
            expect(pluginService.pluginRegistry.has(plugin.id)).toBe(true);
        });
        test("should validate plugin data during registration", async () => {
            const invalidPlugin = {
                name: "", // Missing name
                version: "1.0", // Invalid version format
                extensionPoints: ["INVALID_EXTENSION_POINT"],
                permissions: ["INVALID_PERMISSION"],
            };
            await expect(pluginService.registerPlugin(invalidPlugin)).rejects.toThrow("Plugin validation failed");
        });
        test("should check plugin dependencies", async () => {
            // Register dependency first
            const dependency = {
                name: "Base Plugin",
                version: "1.0.0",
                main: "index.js",
            };
            const basePLugin = await pluginService.registerPlugin(dependency);
            // Register plugin with dependency
            const pluginWithDep = {
                name: "Dependent Plugin",
                version: "1.0.0",
                main: "index.js",
                dependencies: {
                    [basePLugin.id]: "1.0.0",
                },
            };
            const plugin = await pluginService.registerPlugin(pluginWithDep);
            expect(plugin.dependencies[basePLugin.id]).toBe("1.0.0");
        });
        test("should register OSINT source plugins", async () => {
            const pluginData = {
                name: "Dark Web Scraper",
                version: "1.0.0",
                main: "index.js",
                extensionPoints: ["OSINT_SOURCE"],
                permissions: ["OSINT_READ"],
            };
            const plugin = await pluginService.registerPlugin(pluginData);
            expect(plugin.extensionPoints).toContain("OSINT_SOURCE");
        });
        test("should reject plugins with missing dependencies", async () => {
            const pluginWithMissingDep = {
                name: "Dependent Plugin",
                version: "1.0.0",
                main: "index.js",
                dependencies: {
                    "non-existent-plugin": "1.0.0",
                },
            };
            await expect(pluginService.registerPlugin(pluginWithMissingDep)).rejects.toThrow("Missing dependencies");
        });
    });
    describe("Plugin Loading and Sandboxing", () => {
        test("should create secure sandboxes for plugins", async () => {
            const plugin = {
                id: "plugin123",
                name: "Test Plugin",
                sandboxed: true,
                permissions: ["ENTITY_READ"],
            };
            const sandbox = await pluginService.createPluginSandbox(plugin);
            expect(sandbox.id).toBeDefined();
            expect(sandbox.pluginId).toBe("plugin123");
            expect(sandbox.context).toBeDefined();
            expect(sandbox.limits).toBeDefined();
            expect(sandbox.limits.memory).toBe(100 * 1024 * 1024); // 100MB
            expect(sandbox.limits.cpu).toBe(5000); // 5 seconds
        });
        test("should provide restricted API to sandboxed plugins", async () => {
            const plugin = {
                id: "plugin123",
                name: "Test Plugin",
                permissions: ["ENTITY_READ", "ANALYTICS_RUN"],
            };
            const api = pluginService.createPluginAPI(plugin);
            expect(api.getPluginInfo).toBeDefined();
            expect(api.emit).toBeDefined();
            expect(api.log).toBeDefined();
            expect(api.getConfig).toBeDefined();
            expect(api.setConfig).toBeDefined();
            expect(api.data).toBeDefined();
            expect(api.data.getEntity).toBeDefined(); // Has ENTITY_READ permission
            expect(api.data.runAnalytics).toBeDefined(); // Has ANALYTICS_RUN permission
        });
        test("should restrict API access based on permissions", async () => {
            const limitedPlugin = {
                id: "limited123",
                name: "Limited Plugin",
                permissions: ["ENTITY_READ"], // Only has read permission
            };
            const api = pluginService.createPluginAPI(limitedPlugin);
            expect(api.data.getEntity).toBeDefined();
            expect(api.data.updateEntity).toBeUndefined(); // No ENTITY_WRITE permission
            expect(api.data.runAnalytics).toBeUndefined(); // No ANALYTICS_RUN permission
        });
        test("should validate required modules in sandbox", () => {
            const plugin = { id: "test", name: "Test" };
            expect(() => pluginService.safeRequire("crypto", plugin)).not.toThrow();
            expect(() => pluginService.safeRequire("lodash", plugin)).not.toThrow();
            expect(() => pluginService.safeRequire("fs", plugin)).toThrow("not allowed");
            expect(() => pluginService.safeRequire("child_process", plugin)).toThrow("not allowed");
        });
    });
    describe("Plugin Lifecycle Management", () => {
        test("should load plugins correctly", async () => {
            const plugin = await pluginService.registerPlugin({
                name: "Test Plugin",
                version: "1.0.0",
                main: "index.js",
                sandboxed: false, // For testing without actual file loading
            });
            // Mock the loadPluginCode method
            pluginService.loadPluginCode = jest.fn().mockResolvedValue({
                initialize: jest.fn(),
                activate: jest.fn(),
                deactivate: jest.fn(),
            });
            const loadedPlugin = await pluginService.loadPlugin(plugin.id);
            expect(loadedPlugin.status).toBe("LOADED");
            expect(loadedPlugin.instance).toBeDefined();
            expect(pluginService.metrics.loadedPlugins).toBe(1);
        });
        test("should activate plugins successfully", async () => {
            const plugin = await pluginService.registerPlugin({
                name: "Test Plugin",
                version: "1.0.0",
                main: "index.js",
            });
            pluginService.loadPluginCode = jest.fn().mockResolvedValue({
                initialize: jest.fn(),
                activate: jest.fn(),
                deactivate: jest.fn(),
            });
            await pluginService.loadPlugin(plugin.id);
            const activatedPlugin = await pluginService.activatePlugin(plugin.id);
            expect(activatedPlugin.status).toBe("ACTIVE");
            expect(activatedPlugin.activatedAt).toBeInstanceOf(Date);
            expect(activatedPlugin.metrics.activations).toBe(1);
            expect(pluginService.metrics.activePlugins).toBe(1);
        });
        test("should deactivate plugins cleanly", async () => {
            const plugin = await pluginService.registerPlugin({
                name: "Test Plugin",
                version: "1.0.0",
                main: "index.js",
            });
            pluginService.loadPluginCode = jest.fn().mockResolvedValue({
                initialize: jest.fn(),
                activate: jest.fn(),
                deactivate: jest.fn(),
            });
            await pluginService.loadPlugin(plugin.id);
            await pluginService.activatePlugin(plugin.id);
            const deactivatedPlugin = await pluginService.deactivatePlugin(plugin.id);
            expect(deactivatedPlugin.status).toBe("LOADED");
            expect(deactivatedPlugin.deactivatedAt).toBeInstanceOf(Date);
            expect(pluginService.metrics.activePlugins).toBe(0);
        });
        test("should handle plugin loading failures", async () => {
            const plugin = await pluginService.registerPlugin({
                name: "Failing Plugin",
                version: "1.0.0",
                main: "index.js",
            });
            pluginService.loadPluginCode = jest
                .fn()
                .mockRejectedValue(new Error("File not found"));
            await expect(pluginService.loadPlugin(plugin.id)).rejects.toThrow("File not found");
            expect(plugin.status).toBe("FAILED");
            expect(pluginService.metrics.failedPlugins).toBe(1);
        });
    });
    describe("Hook System", () => {
        test("should register and execute plugin hooks", async () => {
            const plugin = await pluginService.registerPlugin({
                name: "Hook Plugin",
                version: "1.0.0",
                main: "index.js",
                hooks: ["PRE_ENTITY_CREATE", "POST_ENTITY_CREATE"],
            });
            const mockHookHandler = jest.fn().mockReturnValue({ modified: true });
            pluginService.loadPluginCode = jest.fn().mockResolvedValue({
                initialize: jest.fn(),
                PRE_ENTITY_CREATE: mockHookHandler,
            });
            await pluginService.loadPlugin(plugin.id);
            // Execute hook
            const result = await pluginService.executeHook("PRE_ENTITY_CREATE", {
                id: "ent123",
                label: "Test Entity",
            });
            expect(mockHookHandler).toHaveBeenCalled();
            expect(result.modified).toBe(true);
            expect(pluginService.metrics.hooksExecuted).toBe(1);
        });
        test("should handle hook execution failures gracefully", async () => {
            const plugin = await pluginService.registerPlugin({
                name: "Failing Hook Plugin",
                version: "1.0.0",
                main: "index.js",
                hooks: ["PRE_ENTITY_CREATE"],
            });
            const failingHandler = jest
                .fn()
                .mockRejectedValue(new Error("Hook failed"));
            pluginService.loadPluginCode = jest.fn().mockResolvedValue({
                initialize: jest.fn(),
                PRE_ENTITY_CREATE: failingHandler,
            });
            await pluginService.loadPlugin(plugin.id);
            // Should not throw, but log error
            const result = await pluginService.executeHook("PRE_ENTITY_CREATE", {});
            expect(mockLogger.error).toHaveBeenCalled();
            expect(plugin.metrics.errors).toBe(1);
        });
        test("should respect hook priorities", async () => {
            const plugin1 = await pluginService.registerPlugin({
                name: "High Priority Plugin",
                version: "1.0.0",
                main: "index.js",
                hooks: ["PRE_ENTITY_CREATE"],
            });
            const plugin2 = await pluginService.registerPlugin({
                name: "Low Priority Plugin",
                version: "1.0.0",
                main: "index.js",
                hooks: ["PRE_ENTITY_CREATE"],
            });
            const executionOrder = [];
            pluginService.loadPluginCode = jest
                .fn()
                .mockResolvedValueOnce({
                initialize: jest.fn(),
                PRE_ENTITY_CREATE: () => {
                    executionOrder.push("high");
                },
                PRE_ENTITY_CREATEPriority: 10, // Higher priority
            })
                .mockResolvedValueOnce({
                initialize: jest.fn(),
                PRE_ENTITY_CREATE: () => {
                    executionOrder.push("low");
                },
                PRE_ENTITY_CREATEPriority: 5, // Lower priority
            });
            await pluginService.loadPlugin(plugin1.id);
            await pluginService.loadPlugin(plugin2.id);
            await pluginService.executeHook("PRE_ENTITY_CREATE", {});
            expect(executionOrder).toEqual(["high", "low"]);
        });
    });
    describe("Extension System", () => {
        test("should register plugin extensions", async () => {
            const plugin = await pluginService.registerPlugin({
                name: "Extension Plugin",
                version: "1.0.0",
                main: "index.js",
                extensionPoints: ["ANALYTICS_ALGORITHM"],
                permissions: ["ANALYTICS_RUN", "ML_MODEL_ACCESS"],
            });
            const mockExtension = {
                analyze: jest.fn().mockReturnValue({ results: "test" }),
                train: jest.fn(),
                predict: jest.fn(),
            };
            pluginService.loadPluginCode = jest.fn().mockResolvedValue({
                initialize: jest.fn(),
                analytics_algorithm: mockExtension,
            });
            await pluginService.loadPlugin(plugin.id);
            const extensionPoint = pluginService.extensionPoints.get("ANALYTICS_ALGORITHM");
            expect(extensionPoint.extensions).toHaveLength(1);
            expect(extensionPoint.extensions[0].pluginId).toBe(plugin.id);
        });
        test("should execute extensions", async () => {
            const plugin = await pluginService.registerPlugin({
                name: "Analytics Plugin",
                version: "1.0.0",
                main: "index.js",
                extensionPoints: ["ANALYTICS_ALGORITHM"],
                permissions: ["ANALYTICS_RUN", "ML_MODEL_ACCESS"],
            });
            const mockAnalyze = jest
                .fn()
                .mockResolvedValue({ score: 0.85, confidence: 0.92 });
            pluginService.loadPluginCode = jest.fn().mockResolvedValue({
                initialize: jest.fn(),
                analytics_algorithm: {
                    analyze: mockAnalyze,
                    train: jest.fn(),
                    predict: jest.fn(),
                },
            });
            await pluginService.loadPlugin(plugin.id);
            const results = await pluginService.executeExtension("ANALYTICS_ALGORITHM", "analyze", { data: "test data" });
            expect(results).toHaveLength(1);
            expect(results[0].pluginId).toBe(plugin.id);
            expect(results[0].result.score).toBe(0.85);
            expect(mockAnalyze).toHaveBeenCalledWith({ data: "test data" });
            expect(pluginService.metrics.extensionsExecuted).toBe(1);
        });
        test("should validate extension permissions", async () => {
            const plugin = await pluginService.registerPlugin({
                name: "Unauthorized Plugin",
                version: "1.0.0",
                main: "index.js",
                extensionPoints: ["ANALYTICS_ALGORITHM"],
                permissions: [], // Missing required permissions
            });
            await expect(pluginService.registerExtension(plugin.id, "ANALYTICS_ALGORITHM", {})).rejects.toThrow("Plugin lacks required permission");
        });
    });
    describe("Plugin Installation and Updates", () => {
        test("should install plugin packages", async () => {
            const mockPackage = {
                name: "Installable Plugin",
                version: "1.0.0",
                main: "index.js",
                files: {},
            };
            // Mock file system operations
            pluginService.extractPluginPackage = jest.fn().mockResolvedValue({
                name: "Installable Plugin",
                version: "1.0.0",
                main: "index.js",
            });
            pluginService.savePluginMetadata = jest.fn().mockResolvedValue(true);
            const plugin = await pluginService.installPlugin(mockPackage);
            expect(plugin.id).toBeDefined();
            expect(plugin.name).toBe("Installable Plugin");
            expect(plugin.status).toBe("REGISTERED");
            expect(pluginService.extractPluginPackage).toHaveBeenCalled();
        });
        test("should update existing plugins", async () => {
            const plugin = await pluginService.registerPlugin({
                name: "Updateable Plugin",
                version: "1.0.0",
                main: "index.js",
            });
            pluginService.backupPlugin = jest.fn().mockResolvedValue(true);
            pluginService.updatePluginFiles = jest.fn().mockResolvedValue(true);
            pluginService.loadPluginCode = jest.fn().mockResolvedValue({
                initialize: jest.fn(),
            });
            const updatedPlugin = await pluginService.updatePlugin(plugin.id, {
                version: "1.1.0",
            });
            expect(updatedPlugin.version).toBe("1.1.0");
            expect(updatedPlugin.lastUpdated).toBeInstanceOf(Date);
            expect(pluginService.backupPlugin).toHaveBeenCalled();
        });
        test("should restore backup on update failure", async () => {
            const plugin = await pluginService.registerPlugin({
                name: "Failing Update Plugin",
                version: "1.0.0",
                main: "index.js",
            });
            pluginService.backupPlugin = jest.fn().mockResolvedValue(true);
            pluginService.updatePluginFiles = jest
                .fn()
                .mockRejectedValue(new Error("Update failed"));
            pluginService.restorePlugin = jest.fn().mockResolvedValue(true);
            await expect(pluginService.updatePlugin(plugin.id, { version: "1.1.0" })).rejects.toThrow("Update failed");
            expect(pluginService.restorePlugin).toHaveBeenCalledWith(plugin);
        });
    });
    describe("Plugin Configuration", () => {
        test("should save and load plugin configurations", async () => {
            const plugin = await pluginService.registerPlugin({
                name: "Configurable Plugin",
                version: "1.0.0",
                main: "index.js",
                configuration: {
                    apiKey: "test-key",
                    timeout: 30000,
                    retryCount: 3,
                },
            });
            // Mock file system
            pluginService.fs = {
                writeFile: jest.fn().mockResolvedValue(true),
                readFile: jest.fn().mockResolvedValue(JSON.stringify({
                    apiKey: "updated-key",
                    timeout: 45000,
                })),
            };
            const saved = await pluginService.savePluginConfiguration(plugin.id);
            expect(saved).toBe(true);
            const loaded = await pluginService.loadPluginConfiguration(plugin.id);
            expect(loaded.apiKey).toBe("updated-key");
            expect(loaded.timeout).toBe(45000);
        });
        test("should handle configuration loading errors", async () => {
            pluginService.fs = {
                readFile: jest.fn().mockRejectedValue(new Error("File not found")),
            };
            const config = await pluginService.loadPluginConfiguration("non-existent");
            expect(config).toEqual({});
        });
    });
    describe("Security and Access Control", () => {
        test("should encrypt and decrypt plugin data", () => {
            const sensitiveData = { apiKey: "secret-key", token: "auth-token" };
            const pluginId = "secure-plugin";
            const encrypted = pluginService.encryptPluginData(sensitiveData, pluginId);
            const decrypted = pluginService.decryptPluginData(encrypted, pluginId);
            expect(encrypted).not.toEqual(JSON.stringify(sensitiveData));
            expect(decrypted).toEqual(sensitiveData);
        });
        test("should validate plugin API access", async () => {
            const plugin = {
                id: "test-plugin",
                permissions: ["ENTITY_READ"],
            };
            // Mock secure access methods
            pluginService.secureEntityAccess = jest.fn().mockResolvedValue({
                id: "ent123",
                restricted: true,
            });
            const api = pluginService.createPluginAPI(plugin);
            const entity = await api.data.getEntity("ent123");
            expect(pluginService.secureEntityAccess).toHaveBeenCalledWith("ent123", plugin);
            expect(entity.id).toBe("ent123");
            expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining("accessing entity"));
        });
        test("should audit plugin security operations", async () => {
            const plugin = {
                id: "audited-plugin",
                name: "Audited Plugin",
                permissions: ["ENTITY_UPDATE"],
            };
            pluginService.secureEntityUpdate = jest
                .fn()
                .mockResolvedValue({ success: true });
            const api = pluginService.createPluginAPI(plugin);
            await api.data.updateEntity("ent123", { label: "Updated" });
            expect(pluginService.secureEntityUpdate).toHaveBeenCalledWith("ent123", { label: "Updated" }, plugin);
            expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining("updating entity"));
        });
    });
    describe("Plugin Management API", () => {
        test("should list plugins with filtering", async () => {
            await pluginService.registerPlugin({
                name: "Active Plugin",
                version: "1.0.0",
                main: "index.js",
                extensionPoints: ["ANALYTICS_ALGORITHM"],
            });
            await pluginService.registerPlugin({
                name: "Visualization Plugin",
                version: "1.0.0",
                main: "index.js",
                extensionPoints: ["VISUALIZATION_RENDERER"],
            });
            const allPlugins = pluginService.getPlugins();
            expect(allPlugins).toHaveLength(2);
            const analyticsPlugins = pluginService.getPlugins({
                extensionPoint: "ANALYTICS_ALGORITHM",
            });
            expect(analyticsPlugins).toHaveLength(1);
            expect(analyticsPlugins[0].name).toBe("Active Plugin");
            const registeredPlugins = pluginService.getPlugins({
                status: "REGISTERED",
            });
            expect(registeredPlugins).toHaveLength(2);
        });
        test("should get plugin details", async () => {
            const plugin = await pluginService.registerPlugin({
                name: "Detailed Plugin",
                version: "1.0.0",
                description: "A plugin with detailed information",
                main: "index.js",
            });
            const retrieved = pluginService.getPlugin(plugin.id);
            expect(retrieved).toBeDefined();
            expect(retrieved.name).toBe("Detailed Plugin");
            expect(retrieved.description).toBe("A plugin with detailed information");
        });
        test("should remove plugins completely", async () => {
            const plugin = await pluginService.registerPlugin({
                name: "Removable Plugin",
                version: "1.0.0",
                main: "index.js",
            });
            const removed = await pluginService.removePlugin(plugin.id);
            expect(removed).toBe(true);
            expect(pluginService.pluginRegistry.has(plugin.id)).toBe(false);
            expect(pluginService.plugins.has(plugin.id)).toBe(false);
            expect(pluginService.metrics.totalPlugins).toBe(0);
        });
    });
    describe("Metrics and Monitoring", () => {
        test("should track plugin system metrics", async () => {
            // Register and activate some plugins
            const plugin1 = await pluginService.registerPlugin({
                name: "Plugin 1",
                version: "1.0.0",
                main: "index.js",
            });
            const plugin2 = await pluginService.registerPlugin({
                name: "Plugin 2",
                version: "1.0.0",
                main: "index.js",
            });
            pluginService.loadPluginCode = jest.fn().mockResolvedValue({
                initialize: jest.fn(),
            });
            await pluginService.loadPlugin(plugin1.id);
            await pluginService.loadPlugin(plugin2.id);
            const metrics = pluginService.getMetrics();
            expect(metrics.totalPlugins).toBe(2);
            expect(metrics.loadedPlugins).toBe(2);
            expect(metrics.activePlugins).toBe(0);
            expect(metrics.failedPlugins).toBe(0);
            expect(metrics.pluginBreakdown).toBeDefined();
            expect(metrics.pluginBreakdown.loaded).toBe(2);
            expect(metrics.pluginBreakdown.registered).toBe(0);
        });
        test("should provide plugin performance data", async () => {
            const plugin = await pluginService.registerPlugin({
                name: "Performance Plugin",
                version: "1.0.0",
                main: "index.js",
                hooks: ["PRE_ENTITY_CREATE"],
            });
            const mockHandler = jest.fn().mockResolvedValue({});
            pluginService.loadPluginCode = jest.fn().mockResolvedValue({
                initialize: jest.fn(),
                PRE_ENTITY_CREATE: mockHandler,
            });
            await pluginService.loadPlugin(plugin.id);
            // Execute hook multiple times to generate metrics
            await pluginService.executeHook("PRE_ENTITY_CREATE", {});
            await pluginService.executeHook("PRE_ENTITY_CREATE", {});
            expect(plugin.metrics.executions).toBe(0); // Hook execution doesn't count as extension execution
            expect(plugin.metrics.lastExecution).toBeNull();
            expect(pluginService.metrics.hooksExecuted).toBe(2);
        });
    });
    describe("Error Handling and Recovery", () => {
        test("should handle sandbox creation failures", async () => {
            const plugin = {
                id: "failing-sandbox",
                name: "Failing Sandbox Plugin",
                sandboxed: true,
                permissions: [],
            };
            // Mock VM context creation failure
            const originalCreateContext = require("vm").createContext;
            require("vm").createContext = jest.fn().mockImplementation(() => {
                throw new Error("VM creation failed");
            });
            await expect(pluginService.createPluginSandbox(plugin)).rejects.toThrow("VM creation failed");
            // Restore original function
            require("vm").createContext = originalCreateContext;
        });
        test("should handle plugin timeout scenarios", async () => {
            const plugin = await pluginService.registerPlugin({
                name: "Slow Plugin",
                version: "1.0.0",
                main: "index.js",
                hooks: ["PRE_ENTITY_CREATE"],
            });
            const slowHandler = jest.fn().mockImplementation(() => {
                return new Promise((resolve) => setTimeout(resolve, 10000)); // 10 seconds
            });
            pluginService.loadPluginCode = jest.fn().mockResolvedValue({
                initialize: jest.fn(),
                PRE_ENTITY_CREATE: slowHandler,
            });
            await pluginService.loadPlugin(plugin.id);
            // Should handle timeout gracefully
            const startTime = Date.now();
            await pluginService.executeHook("PRE_ENTITY_CREATE", {});
            const duration = Date.now() - startTime;
            // Should not wait for the full 10 seconds
            expect(duration).toBeLessThan(8000);
        });
    });
    describe("Version Compatibility", () => {
        test("should check semantic version compatibility", () => {
            expect(pluginService.isVersionCompatible("1.2.3", "1.2.0")).toBe(true);
            expect(pluginService.isVersionCompatible("1.2.3", "1.3.0")).toBe(false);
            expect(pluginService.isVersionCompatible("2.0.0", "1.9.9")).toBe(false);
            expect(pluginService.isVersionCompatible("1.2.3", "1.2.3")).toBe(true);
        });
        test("should handle version range specifications", () => {
            expect(pluginService.isVersionCompatible("1.2.3", "^1.2.0")).toBe(true);
            expect(pluginService.isVersionCompatible("1.2.3", "~1.2.0")).toBe(true);
            expect(pluginService.isVersionCompatible("2.0.0", "^1.2.0")).toBe(false);
        });
    });
});
// Performance and integration tests
describe("Plugin Service Performance", () => {
    let pluginService;
    beforeEach(() => {
        pluginService = new PluginService({
            info: jest.fn(),
            error: jest.fn(),
            warn: jest.fn(),
        });
    });
    test("should handle many plugins efficiently", async () => {
        const pluginRegistrations = Array(100)
            .fill()
            .map((_, i) => ({
            name: `Plugin ${i}`,
            version: "1.0.0",
            main: "index.js",
            extensionPoints: i % 2 === 0 ? ["ANALYTICS_ALGORITHM"] : ["VISUALIZATION_RENDERER"],
            permissions: ["ENTITY_READ"],
        }));
        const startTime = Date.now();
        const plugins = await Promise.all(pluginRegistrations.map((data) => pluginService.registerPlugin(data)));
        const duration = Date.now() - startTime;
        expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
        expect(plugins).toHaveLength(100);
        expect(pluginService.getMetrics().totalPlugins).toBe(100);
    });
    test("should execute hooks efficiently with many plugins", async () => {
        // Register multiple plugins with the same hook
        const hookPlugins = Array(50)
            .fill()
            .map((_, i) => ({
            name: `Hook Plugin ${i}`,
            version: "1.0.0",
            main: "index.js",
            hooks: ["PRE_ENTITY_CREATE"],
        }));
        const plugins = await Promise.all(hookPlugins.map((data) => pluginService.registerPlugin(data)));
        // Mock plugin loading
        pluginService.loadPluginCode = jest.fn().mockResolvedValue({
            initialize: jest.fn(),
            PRE_ENTITY_CREATE: jest.fn().mockResolvedValue({}),
        });
        // Load all plugins
        await Promise.all(plugins.map((p) => pluginService.loadPlugin(p.id)));
        const startTime = Date.now();
        await pluginService.executeHook("PRE_ENTITY_CREATE", { test: "data" });
        const duration = Date.now() - startTime;
        expect(duration).toBeLessThan(2000); // Should complete within 2 seconds
        expect(pluginService.metrics.hooksExecuted).toBe(50);
    });
});
//# sourceMappingURL=pluginService.test.js.map