export interface SanitizeResult {
  text: string;
  warnings: string[];
}

const INJECTION_PATTERNS = [/ignore previous instructions/i, /data exfiltration/i, /cypher\s*:/i];

export function sanitizeInput(text: string): SanitizeResult {
  const warnings: string[] = [];
  let cleaned = text;
  INJECTION_PATTERNS.forEach((pat) => {
    if (pat.test(cleaned)) {
      warnings.push('possible prompt injection');
      cleaned = cleaned.replace(pat, '');
    }
  });
  return { text: cleaned, warnings };
}
