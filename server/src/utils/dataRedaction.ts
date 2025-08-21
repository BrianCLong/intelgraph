import { User } from '../types/context'; // Assuming User type is defined here
import logger from '../config/logger';

const logger = logger.child({ name: 'dataRedaction' });

// Define PII types and their associated properties/paths
// This should ideally be driven by a central schema or configuration
const PII_DEFINITIONS = {
  EMAIL: ['email', 'properties.email'],
  PHONE: ['phone', 'properties.phone'],
  SSN: ['ssn', 'properties.ssn'],
  CREDIT_CARD: ['creditCard', 'properties.creditCard'],
  NAME: ['name', 'label', 'properties.name'],
  ADDRESS: ['address', 'properties.address'],
  IP_ADDRESS: ['ipAddress', 'properties.ipAddress'],
  DATE_OF_BIRTH: ['dob', 'properties.dob'],
  // Add more as needed
};

// Define redaction strategies
enum RedactionStrategy {
  REDACT = '[REDACTED]',
  MASK_PARTIAL = 'MASK_PARTIAL', // e.g., email: user***@example.com
  HASH = 'HASH', // e.g., email: sha256(user@example.com)
  NULL = null,
}

// Define roles and their associated redaction policies
// This is a simplified example; a real system would have more granular policies
const REDACTION_POLICIES_BY_ROLE = {
  ADMIN: {
    // Admins see everything, no redaction by default
  },
  ANALYST: {
    EMAIL: RedactionStrategy.MASK_PARTIAL,
    PHONE: RedactionStrategy.MASK_PARTIAL,
    SSN: RedactionStrategy.REDACT,
    CREDIT_CARD: RedactionStrategy.REDACT,
    // Other PII types might not be redacted for analysts
  },
  VIEWER: {
    EMAIL: RedactionStrategy.REDACT,
    PHONE: RedactionStrategy.REDACT,
    SSN: RedactionStrategy.REDACT,
    CREDIT_CARD: RedactionStrategy.REDACT,
    NAME: RedactionStrategy.MASK_PARTIAL,
    ADDRESS: RedactionStrategy.REDACT,
    IP_ADDRESS: RedactionStrategy.REDACT,
    DATE_OF_BIRTH: RedactionStrategy.REDACT,
  },
};

/**
 * Redacts PII from data based on user role and defined policies.
 * @param data The data object to redact.
 * @param user The user performing the export.
 * @param sensitivity Optional sensitivity level for the data (e.g., 'high', 'medium').
 * @returns The redacted data object.
 */
export function redactData(data: any, user: User, sensitivity?: string): any {
  if (!data) return data;

  const userRole = user.role || 'VIEWER'; // Default to VIEWER if no role
  const policy = REDACTION_POLICIES_BY_ROLE[userRole.toUpperCase()] || {};

  // Deep clone data to avoid modifying original object
  const redactedData = JSON.parse(JSON.stringify(data));

  let piiRedactedCount = 0;
  const piiFieldsRedacted: string[] = [];

  const applyRedaction = (obj: any, path: string[]) => {
    if (typeof obj !== 'object' || obj === null) return;

    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const currentPath = [...path, key];
        const fullPath = currentPath.join('.');

        for (const piiType in PII_DEFINITIONS) {
          const piiPaths = PII_DEFINITIONS[piiType as keyof typeof PII_DEFINITIONS];
          if (piiPaths.includes(fullPath)) {
            const strategy = policy[piiType as keyof typeof policy];
            if (strategy) {
              obj[key] = applyStrategy(obj[key], piiType as keyof typeof PII_DEFINITIONS, strategy);
              piiRedactedCount++;
              piiFieldsRedacted.push(fullPath);
              logger.debug(`Redacted PII field: ${fullPath} with strategy: ${strategy}`);
            }
          }
        }

        // Recursively apply redaction to nested objects/arrays
        if (typeof obj[key] === 'object') {
          applyRedaction(obj[key], currentPath);
        }
      }
    }
  };

  applyRedaction(redactedData, []);

  logger.info(`Data redaction complete for user ${user.id} (role: ${userRole}). Redacted ${piiRedactedCount} PII fields.`);
  // You might want to audit this redaction event
  // auditService.logRedaction(user.id, userRole, piiFieldsRedacted, sensitivity);

  return redactedData;
}

function applyStrategy(value: any, piiType: keyof typeof PII_DEFINITIONS, strategy: RedactionStrategy): any {
  if (value === undefined || value === null) return value;

  switch (strategy) {
    case RedactionStrategy.REDACT:
      return RedactionStrategy.REDACT;
    case RedactionStrategy.MASK_PARTIAL:
      return maskPartial(String(value), piiType);
    case RedactionStrategy.HASH:
      return hashValue(String(value));
    case RedactionStrategy.NULL:
      return null;
    default:
      return value;
  }
}

function maskPartial(value: string, piiType: keyof typeof PII_DEFINITIONS): string {
  switch (piiType) {
    case 'EMAIL':
      const atIndex = value.indexOf('@');
      if (atIndex > 0) {
        return `${value.substring(0, 3)}***${value.substring(atIndex)}`;
      }
      return '***';
    case 'PHONE':
      if (value.length > 4) {
        return `***-***-${value.substring(value.length - 4)}`;
      }
      return '***';
    case 'NAME':
      if (value.length > 2) {
        return `${value.substring(0, 1)}***${value.substring(value.length - 1)}`;
      }
      return '***';
    default:
      return '[MASKED]';
  }
}

function hashValue(value: string): string {
  // In a real application, use a strong, secure hashing algorithm
  // For demonstration, a simple SHA-256 like hash
  const crypto = require('crypto');
  return crypto.createHash('sha256').update(value).digest('hex');
}
