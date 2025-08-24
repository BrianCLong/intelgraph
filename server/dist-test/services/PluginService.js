/**
 * Plugin Architecture and Extension Framework - P2 Priority
 * Comprehensive plugin system with dynamic loading, sandboxing, and lifecycle management
 */
const EventEmitter = require("events");
const { v4: uuidv4 } = require("uuid");
const fs = require("fs").promises;
const path = require("path");
const vm = require("vm");
class PluginService extends EventEmitter {
    constructor(logger) {
        super();
        this.logger = logger;
        // Initialize maps
        this.plugins = new Map();
        this.pluginRegistry = new Map();
        this.hooks = new Map();
        this.extensionPoints = new Map();
        this.sandboxes = new Map();
        this.pluginInstances = new Map();
        this.pluginDependencies = new Map();
        // Initialize metrics
        this.metrics = {
            totalPlugins: 0,
            activePlugins: 0,
            loadedPlugins: 0,
            failedPlugins: 0,
            hooksExecuted: 0,
            extensionsExecuted: 0,
        };
        this.initializeExtensionPoints();
        this.initializePluginSystem();
    }
    initializeExtensionPoints() {
        // Core extension points
        this.extensionPoints.set("ENTITY_PROCESSOR", {
            id: "ENTITY_PROCESSOR",
            name: "Entity Processing Extension",
            description: "Extend entity processing with custom logic",
            interface: {
                methods: ["processEntity", "validateEntity", "enrichEntity"],
                events: ["entityProcessed", "entityValidated", "entityEnriched"],
                context: ["entity", "investigation", "user"],
            },
            security: {
                permissions: ["ENTITY_READ", "ENTITY_UPDATE"],
                dataAccess: ["entities", "relationships"],
            },
        });
        this.extensionPoints.set("VISUALIZATION_RENDERER", {
            id: "VISUALIZATION_RENDERER",
            name: "Visualization Renderer Extension",
            description: "Add custom visualization types and renderers",
            interface: {
                methods: ["render", "getConfig", "handleInteraction"],
                events: ["visualizationRendered", "interactionHandled"],
                context: ["data", "configuration", "theme"],
            },
            security: {
                permissions: ["VISUALIZATION_CREATE"],
                dataAccess: ["visualization_data"],
            },
        });
        this.extensionPoints.set("ANALYTICS_ALGORITHM", {
            id: "ANALYTICS_ALGORITHM",
            name: "Analytics Algorithm Extension",
            description: "Add custom analytics algorithms and ML models",
            interface: {
                methods: ["analyze", "train", "predict"],
                events: ["analysisComplete", "modelTrained", "predictionMade"],
                context: ["data", "parameters", "model"],
            },
            security: {
                permissions: ["ANALYTICS_RUN", "ML_MODEL_ACCESS"],
                dataAccess: ["analytics_data", "models"],
            },
        });
        this.extensionPoints.set("DATA_CONNECTOR", {
            id: "DATA_CONNECTOR",
            name: "Data Connector Extension",
            description: "Connect to external data sources",
            interface: {
                methods: ["connect", "query", "sync"],
                events: ["connected", "dataReceived", "syncComplete"],
                context: ["connection", "query", "credentials"],
            },
            security: {
                permissions: ["DATA_IMPORT", "EXTERNAL_CONNECTIONS"],
                dataAccess: ["external_data"],
            },
        });
        this.extensionPoints.set("NOTIFICATION_CHANNEL", {
            id: "NOTIFICATION_CHANNEL",
            name: "Notification Channel Extension",
            description: "Add custom notification delivery channels",
            interface: {
                methods: ["deliver", "validate", "configure"],
                events: ["delivered", "failed", "configured"],
                context: ["notification", "recipient", "channel"],
            },
            security: {
                permissions: ["NOTIFICATION_SEND"],
                dataAccess: ["notifications", "user_preferences"],
            },
        });
        this.extensionPoints.set("SECURITY_SCANNER", {
            id: "SECURITY_SCANNER",
            name: "Security Scanner Extension",
            description: "Add custom security scanning and threat detection",
            interface: {
                methods: ["scan", "analyze", "report"],
                events: ["scanComplete", "threatDetected", "reportGenerated"],
                context: ["data", "rules", "patterns"],
            },
            security: {
                permissions: ["SECURITY_SCAN", "THREAT_ANALYSIS"],
                dataAccess: ["security_data", "audit_logs"],
            },
        });
        this.extensionPoints.set("REPORT_GENERATOR", {
            id: "REPORT_GENERATOR",
            name: "Report Generator Extension",
            description: "Add custom report templates and generators",
            interface: {
                methods: ["generate", "format", "export"],
                events: ["reportGenerated", "formatApplied", "exportComplete"],
                context: ["data", "template", "format"],
            },
            security: {
                permissions: ["REPORT_GENERATE", "DATA_EXPORT"],
                dataAccess: ["report_data", "templates"],
            },
        });
        this.extensionPoints.set("WORKFLOW_STEP", {
            id: "WORKFLOW_STEP",
            name: "Workflow Step Extension",
            description: "Add custom workflow steps and automation",
            interface: {
                methods: ["execute", "validate", "rollback"],
                events: ["stepExecuted", "stepValidated", "stepRolledBack"],
                context: ["workflow", "step", "data"],
            },
            security: {
                permissions: ["WORKFLOW_EXECUTE"],
                dataAccess: ["workflow_data"],
            },
        });
        this.extensionPoints.set("OSINT_SOURCE", {
            id: "OSINT_SOURCE",
            name: "OSINT Source Extension",
            description: "Integrate dark web and social media scrapers",
            interface: {
                methods: ["scrape", "normalize"],
                events: ["dataCollected", "error"],
                context: ["query", "source", "auth"],
            },
            security: {
                permissions: ["OSINT_READ"],
                dataAccess: ["osint_data", "audit_logs"],
            },
        });
    }
    initializePluginSystem() {
        // Initialize hook system
        this.hooks.set("PRE_ENTITY_CREATE", []);
        this.hooks.set("POST_ENTITY_CREATE", []);
        this.hooks.set("PRE_ENTITY_UPDATE", []);
        this.hooks.set("POST_ENTITY_UPDATE", []);
        this.hooks.set("PRE_ANALYTICS_RUN", []);
        this.hooks.set("POST_ANALYTICS_RUN", []);
        this.hooks.set("PRE_REPORT_GENERATE", []);
        this.hooks.set("POST_REPORT_GENERATE", []);
        this.hooks.set("PRE_VISUALIZATION_RENDER", []);
        this.hooks.set("POST_VISUALIZATION_RENDER", []);
        // Create plugin directories if they don't exist
        this.ensurePluginDirectories();
    }
    async ensurePluginDirectories() {
        const dirs = [
            "plugins",
            "plugins/installed",
            "plugins/disabled",
            "plugins/cache",
            "plugins/configs",
        ];
        for (const dir of dirs) {
            try {
                await fs.mkdir(dir, { recursive: true });
            }
            catch (error) {
                this.logger.warn(`Failed to create plugin directory ${dir}:`, error);
            }
        }
    }
    // Plugin registration and management
    async registerPlugin(pluginData) {
        const plugin = {
            id: pluginData.id || uuidv4(),
            name: pluginData.name,
            version: pluginData.version,
            description: pluginData.description,
            author: pluginData.author,
            homepage: pluginData.homepage,
            repository: pluginData.repository,
            keywords: pluginData.keywords || [],
            // Technical specifications
            main: pluginData.main || "index.js",
            extensionPoints: pluginData.extensionPoints || [],
            hooks: pluginData.hooks || [],
            dependencies: pluginData.dependencies || {},
            peerDependencies: pluginData.peerDependencies || {},
            // Security and permissions
            permissions: pluginData.permissions || [],
            trustedDomains: pluginData.trustedDomains || [],
            sandboxed: pluginData.sandboxed !== false,
            // Lifecycle
            status: "REGISTERED",
            registeredAt: new Date(),
            lastUpdated: new Date(),
            activatedAt: null,
            deactivatedAt: null,
            // Configuration
            configuration: pluginData.configuration || {},
            settings: pluginData.settings || {},
            // Runtime
            instance: null,
            sandbox: null,
            metrics: {
                activations: 0,
                executions: 0,
                errors: 0,
                lastExecution: null,
            },
        };
        // Validate plugin
        await this.validatePlugin(plugin);
        // Check dependencies
        await this.checkDependencies(plugin);
        // Store in registry
        this.pluginRegistry.set(plugin.id, plugin);
        this.plugins.set(plugin.id, plugin);
        this.metrics.totalPlugins++;
        this.emit("pluginRegistered", plugin);
        return plugin;
    }
    async loadPlugin(pluginId) {
        const plugin = this.pluginRegistry.get(pluginId);
        if (!plugin) {
            throw new Error(`Plugin not found: ${pluginId}`);
        }
        if (plugin.status === "LOADED" || plugin.status === "ACTIVE") {
            return plugin;
        }
        try {
            plugin.status = "LOADING";
            // Create sandbox if needed
            if (plugin.sandboxed) {
                plugin.sandbox = await this.createPluginSandbox(plugin);
            }
            // Load plugin code
            plugin.instance = await this.loadPluginCode(plugin);
            // Initialize plugin
            if (plugin.instance.initialize) {
                await plugin.instance.initialize(this.createPluginContext(plugin));
            }
            // Register hooks
            await this.registerPluginHooks(plugin);
            // Register extensions
            await this.registerPluginExtensions(plugin);
            plugin.status = "LOADED";
            plugin.lastUpdated = new Date();
            this.metrics.loadedPlugins++;
            this.emit("pluginLoaded", plugin);
            return plugin;
        }
        catch (error) {
            plugin.status = "FAILED";
            plugin.error = error.message;
            this.metrics.failedPlugins++;
            this.logger.error(`Failed to load plugin ${pluginId}:`, error);
            throw error;
        }
    }
    async activatePlugin(pluginId) {
        const plugin = this.pluginRegistry.get(pluginId);
        if (!plugin) {
            throw new Error(`Plugin not found: ${pluginId}`);
        }
        if (plugin.status !== "LOADED") {
            await this.loadPlugin(pluginId);
        }
        try {
            plugin.status = "ACTIVATING";
            // Activate plugin
            if (plugin.instance.activate) {
                await plugin.instance.activate();
            }
            plugin.status = "ACTIVE";
            plugin.activatedAt = new Date();
            plugin.metrics.activations++;
            this.metrics.activePlugins++;
            this.emit("pluginActivated", plugin);
            return plugin;
        }
        catch (error) {
            plugin.status = "FAILED";
            plugin.error = error.message;
            this.logger.error(`Failed to activate plugin ${pluginId}:`, error);
            throw error;
        }
    }
    async deactivatePlugin(pluginId) {
        const plugin = this.pluginRegistry.get(pluginId);
        if (!plugin) {
            throw new Error(`Plugin not found: ${pluginId}`);
        }
        if (plugin.status !== "ACTIVE") {
            return plugin;
        }
        try {
            plugin.status = "DEACTIVATING";
            // Deactivate plugin
            if (plugin.instance.deactivate) {
                await plugin.instance.deactivate();
            }
            // Unregister hooks and extensions
            await this.unregisterPluginHooks(plugin);
            await this.unregisterPluginExtensions(plugin);
            plugin.status = "LOADED";
            plugin.deactivatedAt = new Date();
            this.metrics.activePlugins--;
            this.emit("pluginDeactivated", plugin);
            return plugin;
        }
        catch (error) {
            this.logger.error(`Failed to deactivate plugin ${pluginId}:`, error);
            throw error;
        }
    }
    async unloadPlugin(pluginId) {
        const plugin = this.pluginRegistry.get(pluginId);
        if (!plugin) {
            throw new Error(`Plugin not found: ${pluginId}`);
        }
        if (plugin.status === "ACTIVE") {
            await this.deactivatePlugin(pluginId);
        }
        try {
            // Cleanup plugin
            if (plugin.instance && plugin.instance.cleanup) {
                await plugin.instance.cleanup();
            }
            // Destroy sandbox
            if (plugin.sandbox) {
                plugin.sandbox = null;
            }
            plugin.instance = null;
            plugin.status = "REGISTERED";
            this.metrics.loadedPlugins--;
            this.emit("pluginUnloaded", plugin);
            return plugin;
        }
        catch (error) {
            this.logger.error(`Failed to unload plugin ${pluginId}:`, error);
            throw error;
        }
    }
    async removePlugin(pluginId) {
        const plugin = this.pluginRegistry.get(pluginId);
        if (!plugin) {
            throw new Error(`Plugin not found: ${pluginId}`);
        }
        // Unload if loaded
        if (plugin.status !== "REGISTERED") {
            await this.unloadPlugin(pluginId);
        }
        // Remove from registry
        this.pluginRegistry.delete(pluginId);
        this.plugins.delete(pluginId);
        this.metrics.totalPlugins--;
        this.emit("pluginRemoved", plugin);
        return true;
    }
    // Plugin validation and security
    async validatePlugin(plugin) {
        const errors = [];
        // Required fields
        if (!plugin.name)
            errors.push("Plugin name is required");
        if (!plugin.version)
            errors.push("Plugin version is required");
        if (!plugin.main)
            errors.push("Plugin main file is required");
        // Version format
        if (plugin.version && !/^\d+\.\d+\.\d+/.test(plugin.version)) {
            errors.push("Invalid version format (expected semver)");
        }
        // Extension points validation
        for (const extPointId of plugin.extensionPoints) {
            if (!this.extensionPoints.has(extPointId)) {
                errors.push(`Unknown extension point: ${extPointId}`);
            }
        }
        // Permissions validation
        const validPermissions = [
            "ENTITY_READ",
            "ENTITY_WRITE",
            "ANALYTICS_RUN",
            "VISUALIZATION_CREATE",
            "REPORT_GENERATE",
            "DATA_EXPORT",
            "NOTIFICATION_SEND",
            "SECURITY_SCAN",
            "ML_MODEL_ACCESS",
            "OSINT_READ",
        ];
        for (const permission of plugin.permissions) {
            if (!validPermissions.includes(permission)) {
                errors.push(`Invalid permission: ${permission}`);
            }
        }
        if (errors.length > 0) {
            throw new Error(`Plugin validation failed: ${errors.join(", ")}`);
        }
        return true;
    }
    async checkDependencies(plugin) {
        const missing = [];
        // Check plugin dependencies
        for (const [depId, version] of Object.entries(plugin.dependencies)) {
            const dependency = this.pluginRegistry.get(depId);
            if (!dependency) {
                missing.push(`${depId}@${version}`);
            }
            else if (!this.isVersionCompatible(dependency.version, version)) {
                missing.push(`${depId}@${version} (found ${dependency.version})`);
            }
        }
        // Check peer dependencies
        for (const [depId, version] of Object.entries(plugin.peerDependencies)) {
            const dependency = this.pluginRegistry.get(depId);
            if (dependency &&
                !this.isVersionCompatible(dependency.version, version)) {
                missing.push(`peer ${depId}@${version} (found ${dependency.version})`);
            }
        }
        if (missing.length > 0) {
            throw new Error(`Missing dependencies: ${missing.join(", ")}`);
        }
        // Store dependency relationships
        this.pluginDependencies.set(plugin.id, {
            dependencies: Object.keys(plugin.dependencies),
            dependents: [], // Will be populated by dependent plugins
        });
        // Update dependents
        for (const depId of Object.keys(plugin.dependencies)) {
            const depRelations = this.pluginDependencies.get(depId);
            if (depRelations) {
                depRelations.dependents.push(plugin.id);
            }
        }
        return true;
    }
    isVersionCompatible(available, required) {
        // Simple semver compatibility check
        const [availMajor, availMinor, availPatch] = available
            .split(".")
            .map(Number);
        const [reqMajor, reqMinor, reqPatch] = required
            .replace(/[^\d.]/g, "")
            .split(".")
            .map(Number);
        if (availMajor !== reqMajor)
            return false;
        if (availMinor < reqMinor)
            return false;
        if (availMinor === reqMinor && availPatch < reqPatch)
            return false;
        return true;
    }
    async createPluginSandbox(plugin) {
        if (!plugin?.id) {
            throw new Error("Invalid plugin: missing id");
        }
        try {
            const sandbox = {
                id: uuidv4(),
                pluginId: plugin.id,
                limits: {
                    memory: 100 * 1024 * 1024, // 100MB
                    cpu: 5000, // 5 seconds
                    network: plugin.trustedDomains || [],
                },
            };
            const pluginAPI = await this.createPluginAPI(plugin);
            const context = {
                console: {
                    log: (...args) => this.logger.info(`[${plugin.name}]`, ...args),
                    error: (...args) => this.logger.error(`[${plugin.name}]`, ...args),
                    warn: (...args) => this.logger.warn(`[${plugin.name}]`, ...args),
                },
                pluginAPI,
                JSON,
                Math,
                Date,
                setTimeout: (fn, delay) => setTimeout(fn, Math.min(delay, 30000)), // Max 30s
                clearTimeout,
                setInterval: (fn, delay) => setInterval(fn, Math.max(delay, 1000)), // Min 1s
                clearInterval,
                require: (moduleName) => this.safeRequire(moduleName, plugin),
                module: { exports: {} },
                exports: {},
                process: {
                    env: Object.freeze({ NODE_ENV: process.env.NODE_ENV }),
                },
            };
            sandbox.context = vm.createContext(context);
            this.sandboxes.set(sandbox.id, sandbox);
            return sandbox;
        }
        catch (err) {
            throw new Error(`Plugin sandbox creation failed: ${err.message}`);
        }
    }
    createPluginAPI(plugin) {
        return {
            // Plugin metadata
            getPluginInfo: () => ({
                id: plugin.id,
                name: plugin.name,
                version: plugin.version,
            }),
            // Event system
            emit: (event, data) => this.emit(`plugin:${plugin.id}:${event}`, data),
            on: (event, handler) => this.on(`plugin:${plugin.id}:${event}`, handler),
            // Logging
            log: {
                info: (...args) => this.logger.info(`[${plugin.name}]`, ...args),
                error: (...args) => this.logger.error(`[${plugin.name}]`, ...args),
                warn: (...args) => this.logger.warn(`[${plugin.name}]`, ...args),
                debug: (...args) => this.logger.debug(`[${plugin.name}]`, ...args),
            },
            // Configuration
            getConfig: (key) => key ? plugin.configuration[key] : plugin.configuration,
            setConfig: (key, value) => {
                plugin.configuration[key] = value;
                this.savePluginConfiguration(plugin.id);
            },
            // Extension points
            registerExtension: (extensionPointId, implementation) => {
                return this.registerExtension(plugin.id, extensionPointId, implementation);
            },
            // Hook system
            registerHook: (hookName, handler) => {
                return this.registerHook(plugin.id, hookName, handler);
            },
            // Data access (based on permissions)
            data: this.createDataAPI(plugin),
            // Utility functions
            utils: {
                uuid: () => uuidv4(),
                sanitize: (str) => str.replace(/[<>]/g, ""),
                encrypt: (data) => this.encryptPluginData(data, plugin.id),
                decrypt: (data) => this.decryptPluginData(data, plugin.id),
            },
        };
    }
    createDataAPI(plugin) {
        const api = {};
        // Ensure plugin has permissions property
        const permissions = plugin.permissions || [];
        if (permissions.includes("ENTITY_READ")) {
            api.getEntity = async (entityId) => {
                this.logger.info(`Plugin ${plugin.name || plugin.id} accessing entity ${entityId}`);
                return this.secureEntityAccess(entityId, plugin);
            };
        }
        if (permissions.includes("ENTITY_WRITE") ||
            permissions.includes("ENTITY_UPDATE")) {
            api.updateEntity = async (entityId, updates) => {
                this.logger.info(`Plugin ${plugin.name || plugin.id} updating entity ${entityId}`);
                return this.secureEntityUpdate(entityId, updates, plugin);
            };
        }
        if (plugin.permissions.includes("ANALYTICS_RUN")) {
            api.runAnalytics = async (type, parameters) => {
                return this.secureAnalyticsRun(type, parameters, plugin);
            };
        }
        return api;
    }
    safeRequire(moduleName, plugin) {
        const allowedModules = [
            "crypto",
            "util",
            "events",
            "stream",
            "querystring",
            "url",
            "path",
            "lodash",
            "moment",
        ];
        if (!allowedModules.includes(moduleName)) {
            throw new Error(`Module '${moduleName}' is not allowed in plugins`);
        }
        return require(moduleName);
    }
    async loadPluginCode(plugin) {
        const pluginPath = path.join("plugins/installed", plugin.id, plugin.main);
        try {
            const code = await fs.readFile(pluginPath, "utf8");
            if (plugin.sandboxed) {
                // Execute in sandbox
                vm.runInContext(code, plugin.sandbox.context, {
                    filename: pluginPath,
                    timeout: 10000, // 10 seconds
                });
                return plugin.sandbox.context.module.exports;
            }
            else {
                // Direct require (trusted plugins only)
                return require(path.resolve(pluginPath));
            }
        }
        catch (error) {
            throw new Error(`Failed to load plugin code: ${error.message}`);
        }
    }
    createPluginContext(plugin) {
        return {
            plugin: {
                id: plugin.id,
                name: plugin.name,
                version: plugin.version,
                config: plugin.configuration,
            },
            system: {
                version: "1.0.0",
                extensionPoints: Array.from(this.extensionPoints.keys()),
                hooks: Array.from(this.hooks.keys()),
            },
            api: this.createPluginAPI(plugin),
        };
    }
    // Hook system
    async registerPluginHooks(plugin) {
        for (const hookName of plugin.hooks) {
            if (!this.hooks.has(hookName)) {
                this.hooks.set(hookName, []);
            }
            if (plugin.instance[hookName]) {
                this.hooks.get(hookName).push({
                    pluginId: plugin.id,
                    handler: plugin.instance[hookName].bind(plugin.instance),
                    priority: plugin.instance[`${hookName}Priority`] || 0,
                });
                // Sort by priority
                this.hooks.get(hookName).sort((a, b) => b.priority - a.priority);
            }
        }
    }
    async unregisterPluginHooks(plugin) {
        for (const hookName of plugin.hooks) {
            const hookHandlers = this.hooks.get(hookName);
            if (hookHandlers) {
                const filtered = hookHandlers.filter((h) => h.pluginId !== plugin.id);
                this.hooks.set(hookName, filtered);
            }
        }
    }
    async executeHook(hookName, data, context = {}) {
        const handlers = this.hooks.get(hookName);
        if (!handlers || handlers.length === 0) {
            return data;
        }
        let result = data;
        for (const hook of handlers) {
            try {
                // Enforce timeout for hook handlers (5s)
                const timeout = new Promise((resolve) => setTimeout(() => resolve(undefined), 3000));
                const hookPromise = Promise.resolve().then(() => hook.handler(result, context));
                const hookResult = await Promise.race([hookPromise, timeout]);
                if (hookResult !== undefined) {
                    result = hookResult;
                }
                this.metrics.hooksExecuted++;
            }
            catch (error) {
                this.logger.error(`Hook execution failed (${hookName}, ${hook.pluginId}):`, error);
                // Update plugin metrics
                const plugin = this.pluginRegistry.get(hook.pluginId);
                if (plugin) {
                    plugin.metrics.errors++;
                }
            }
        }
        return result;
    }
    registerHook(pluginId, hookName, handler) {
        if (!this.hooks.has(hookName)) {
            this.hooks.set(hookName, []);
        }
        this.hooks.get(hookName).push({
            pluginId,
            handler,
            priority: 0,
        });
        return true;
    }
    // Extension system
    async registerPluginExtensions(plugin) {
        for (const extensionPointId of plugin.extensionPoints) {
            const extensionPoint = this.extensionPoints.get(extensionPointId);
            if (!extensionPoint)
                continue;
            if (plugin.instance[extensionPointId.toLowerCase()]) {
                await this.registerExtension(plugin.id, extensionPointId, plugin.instance[extensionPointId.toLowerCase()]);
            }
        }
    }
    async unregisterPluginExtensions(plugin) {
        for (const extensionPointId of plugin.extensionPoints) {
            await this.unregisterExtension(plugin.id, extensionPointId);
        }
    }
    async registerExtension(pluginId, extensionPointId, implementation) {
        const extensionPoint = this.extensionPoints.get(extensionPointId);
        if (!extensionPoint) {
            throw new Error(`Unknown extension point: ${extensionPointId}`);
        }
        const plugin = this.pluginRegistry.get(pluginId);
        if (!plugin) {
            throw new Error(`Plugin not found: ${pluginId}`);
        }
        // Validate permissions
        for (const permission of extensionPoint.security.permissions) {
            if (!plugin.permissions.includes(permission)) {
                throw new Error(`Plugin lacks required permission: ${permission}`);
            }
        }
        // Store extension
        if (!extensionPoint.extensions) {
            extensionPoint.extensions = [];
        }
        extensionPoint.extensions.push({
            pluginId,
            implementation,
            registeredAt: new Date(),
        });
        this.emit("extensionRegistered", { pluginId, extensionPointId });
        return true;
    }
    async unregisterExtension(pluginId, extensionPointId) {
        const extensionPoint = this.extensionPoints.get(extensionPointId);
        if (!extensionPoint || !extensionPoint.extensions) {
            return false;
        }
        extensionPoint.extensions = extensionPoint.extensions.filter((ext) => ext.pluginId !== pluginId);
        return true;
    }
    async executeExtension(extensionPointId, method, ...args) {
        const extensionPoint = this.extensionPoints.get(extensionPointId);
        if (!extensionPoint || !extensionPoint.extensions) {
            return [];
        }
        const results = [];
        for (const extension of extensionPoint.extensions) {
            try {
                if (extension.implementation[method]) {
                    const result = await extension.implementation[method](...args);
                    results.push({
                        pluginId: extension.pluginId,
                        result,
                    });
                    this.metrics.extensionsExecuted++;
                    // Update plugin metrics
                    const plugin = this.pluginRegistry.get(extension.pluginId);
                    if (plugin) {
                        plugin.metrics.executions++;
                        plugin.metrics.lastExecution = new Date();
                    }
                }
            }
            catch (error) {
                this.logger.error(`Extension execution failed (${extensionPointId}, ${extension.pluginId}):`, error);
                // Update plugin metrics
                const plugin = this.pluginRegistry.get(extension.pluginId);
                if (plugin) {
                    plugin.metrics.errors++;
                }
            }
        }
        return results;
    }
    // Plugin lifecycle management
    async installPlugin(pluginPackage) {
        const pluginId = uuidv4();
        const installPath = path.join("plugins/installed", pluginId);
        try {
            // Create plugin directory
            await fs.mkdir(installPath, { recursive: true });
            // Extract and validate plugin package
            const pluginData = await this.extractPluginPackage(pluginPackage, installPath);
            // Register plugin
            pluginData.id = pluginId;
            const plugin = await this.registerPlugin(pluginData);
            // Save plugin metadata
            await this.savePluginMetadata(plugin);
            this.emit("pluginInstalled", plugin);
            return plugin;
        }
        catch (error) {
            // Cleanup on failure
            try {
                await fs.rmdir(installPath, { recursive: true });
            }
            catch (cleanupError) {
                this.logger.warn("Failed to cleanup failed installation:", cleanupError);
            }
            throw error;
        }
    }
    async updatePlugin(pluginId, newVersion) {
        const plugin = this.pluginRegistry.get(pluginId);
        if (!plugin) {
            throw new Error(`Plugin not found: ${pluginId}`);
        }
        const wasActive = plugin.status === "ACTIVE";
        // Deactivate if active
        if (wasActive) {
            await this.deactivatePlugin(pluginId);
        }
        // Backup current version
        await this.backupPlugin(plugin);
        try {
            // Update plugin files
            await this.updatePluginFiles(plugin, newVersion);
            // Update metadata
            plugin.version = newVersion.version;
            plugin.lastUpdated = new Date();
            // Reload if was active
            if (wasActive) {
                await this.loadPlugin(pluginId);
                await this.activatePlugin(pluginId);
            }
            this.emit("pluginUpdated", plugin);
            return plugin;
        }
        catch (error) {
            // Restore backup on failure
            await this.restorePlugin(plugin);
            throw error;
        }
    }
    // Configuration management
    async savePluginConfiguration(pluginId) {
        const plugin = this.pluginRegistry.get(pluginId);
        if (!plugin)
            return false;
        const configPath = path.join("plugins/configs", `${pluginId}.json`);
        const writer = this.fs?.writeFile || fs.writeFile;
        await writer(configPath, JSON.stringify(plugin.configuration, null, 2));
        return true;
    }
    async loadPluginConfiguration(pluginId) {
        const configPath = path.join("plugins/configs", `${pluginId}.json`);
        try {
            const reader = this.fs?.readFile || fs.readFile;
            const configData = await reader(configPath, "utf8");
            return JSON.parse(configData);
        }
        catch (error) {
            return {};
        }
    }
    // Security helpers
    async secureEntityAccess(entityId, plugin) {
        // Implement secure entity access with audit logging
        this.logger.info(`Plugin ${plugin.name} accessing entity ${entityId}`);
        // Return entity data based on plugin permissions
        return { id: entityId, restricted: true };
    }
    async secureEntityUpdate(entityId, updates, plugin) {
        // Implement secure entity updates with validation
        this.logger.info(`Plugin ${plugin.name} updating entity ${entityId}`);
        return { success: true };
    }
    async secureAnalyticsRun(type, parameters, plugin) {
        // Implement secure analytics execution
        this.logger.info(`Plugin ${plugin.name} running analytics ${type}`);
        return { result: "analytics_result" };
    }
    encryptPluginData(data, pluginId) {
        // Implement encryption for plugin data
        return Buffer.from(JSON.stringify(data)).toString("base64");
    }
    decryptPluginData(encryptedData, pluginId) {
        // Implement decryption for plugin data
        return JSON.parse(Buffer.from(encryptedData, "base64").toString());
    }
    // Public API methods
    getPlugins(filter = {}) {
        const plugins = Array.from(this.pluginRegistry.values());
        if (filter.status) {
            return plugins.filter((p) => p.status === filter.status);
        }
        if (filter.extensionPoint) {
            return plugins.filter((p) => p.extensionPoints.includes(filter.extensionPoint));
        }
        return plugins;
    }
    getPlugin(pluginId) {
        return this.pluginRegistry.get(pluginId);
    }
    getExtensionPoints() {
        return Array.from(this.extensionPoints.values());
    }
    getHooks() {
        return Array.from(this.hooks.keys());
    }
    getMetrics() {
        return {
            ...this.metrics,
            pluginBreakdown: {
                active: this.getPlugins({ status: "ACTIVE" }).length,
                loaded: this.getPlugins({ status: "LOADED" }).length,
                failed: this.getPlugins({ status: "FAILED" }).length,
                registered: this.getPlugins({ status: "REGISTERED" }).length,
            },
        };
    }
    // Placeholder methods for full implementation
    async extractPluginPackage(packageData, installPath) {
        return { name: "Sample Plugin", version: "1.0.0", main: "index.js" };
    }
    async savePluginMetadata(plugin) { }
    async backupPlugin(plugin) { }
    async updatePluginFiles(plugin, newVersion) { }
    async restorePlugin(plugin) { }
}
module.exports = PluginService;
//# sourceMappingURL=PluginService.js.map