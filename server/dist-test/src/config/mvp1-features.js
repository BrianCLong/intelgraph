"use strict";
/**
 * MVP-1+ Feature Flag Configuration
 * Controls rollout of enterprise features
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.isFeatureEnabled = isFeatureEnabled;
exports.updateFeatureFlags = updateFeatureFlags;
exports.getAllFeatureFlags = getAllFeatureFlags;
exports.requireFeature = requireFeature;
exports.loadFeatureFlagsFromDatabase = loadFeatureFlagsFromDatabase;
// Default feature flags for MVP-1+
const DEFAULT_FLAGS = {
    RBAC_FINE_GRAINED: true,
    AUDIT_TRAIL: true,
    COPILOT_SERVICE: true,
    ANALYTICS_PANEL: true,
    PDF_EXPORT: true,
    OPENTELEMETRY: true,
};
// Runtime feature flags (can be overridden by database or environment)
let runtimeFlags = { ...DEFAULT_FLAGS };
/**
 * Check if a feature is enabled
 */
function isFeatureEnabled(feature) {
    // Check environment variable override first
    const envKey = `FEATURE_${feature}`;
    const envValue = process.env[envKey];
    if (envValue !== undefined) {
        return envValue.toLowerCase() === 'true';
    }
    // Fall back to runtime flag
    return runtimeFlags[feature] ?? false;
}
/**
 * Update runtime feature flags (used by database sync)
 */
function updateFeatureFlags(flags) {
    runtimeFlags = { ...runtimeFlags, ...flags };
}
/**
 * Get all current feature flags
 */
function getAllFeatureFlags() {
    return { ...runtimeFlags };
}
/**
 * Decorator for requiring a feature to be enabled
 */
function requireFeature(feature) {
    return function (target, propertyKey, descriptor) {
        const originalMethod = descriptor.value;
        descriptor.value = function (...args) {
            if (!isFeatureEnabled(feature)) {
                throw new Error(`Feature ${feature} is not enabled`);
            }
            return originalMethod.apply(this, args);
        };
        return descriptor;
    };
}
/**
 * Load feature flags from database (called at startup)
 */
async function loadFeatureFlagsFromDatabase() {
    try {
        // This would typically load from database
        // For now, use environment variables
        const envFlags = {};
        for (const key of Object.keys(DEFAULT_FLAGS)) {
            const envValue = process.env[`FEATURE_${key}`];
            if (envValue !== undefined) {
                envFlags[key] = envValue.toLowerCase() === 'true';
            }
        }
        updateFeatureFlags(envFlags);
    }
    catch (error) {
        console.warn('Failed to load feature flags from database:', error);
        // Continue with default flags
    }
}
exports.default = {
    isFeatureEnabled,
    updateFeatureFlags,
    getAllFeatureFlags,
    requireFeature,
    loadFeatureFlagsFromDatabase,
};
//# sourceMappingURL=mvp1-features.js.map