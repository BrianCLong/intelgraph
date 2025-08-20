/**
 * MVP-1+ Feature Flag Configuration
 * Controls rollout of enterprise features
 */

interface FeatureFlags {
  RBAC_FINE_GRAINED: boolean;
  AUDIT_TRAIL: boolean;
  COPILOT_SERVICE: boolean;
  ANALYTICS_PANEL: boolean;
  PDF_EXPORT: boolean;
  OPENTELEMETRY: boolean;
}

// Default feature flags for MVP-1+
const DEFAULT_FLAGS: FeatureFlags = {
  RBAC_FINE_GRAINED: true,
  AUDIT_TRAIL: true,
  COPILOT_SERVICE: true,
  ANALYTICS_PANEL: true,
  PDF_EXPORT: true,
  OPENTELEMETRY: true,
};

// Runtime feature flags (can be overridden by database or environment)
let runtimeFlags: FeatureFlags = { ...DEFAULT_FLAGS };

/**
 * Check if a feature is enabled
 */
export function isFeatureEnabled(feature: keyof FeatureFlags): boolean {
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
export function updateFeatureFlags(flags: Partial<FeatureFlags>): void {
  runtimeFlags = { ...runtimeFlags, ...flags };
}

/**
 * Get all current feature flags
 */
export function getAllFeatureFlags(): FeatureFlags {
  return { ...runtimeFlags };
}

/**
 * Decorator for requiring a feature to be enabled
 */
export function requireFeature(feature: keyof FeatureFlags) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = function (...args: any[]) {
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
export async function loadFeatureFlagsFromDatabase(): Promise<void> {
  try {
    // This would typically load from database
    // For now, use environment variables
    const envFlags: Partial<FeatureFlags> = {};
    
    for (const key of Object.keys(DEFAULT_FLAGS) as Array<keyof FeatureFlags>) {
      const envValue = process.env[`FEATURE_${key}`];
      if (envValue !== undefined) {
        envFlags[key] = envValue.toLowerCase() === 'true';
      }
    }

    updateFeatureFlags(envFlags);
  } catch (error) {
    console.warn('Failed to load feature flags from database:', error);
    // Continue with default flags
  }
}

export default {
  isFeatureEnabled,
  updateFeatureFlags,
  getAllFeatureFlags,
  requireFeature,
  loadFeatureFlagsFromDatabase,
};