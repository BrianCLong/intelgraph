const EMAIL = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;
const PHONE = /\b\d{3}-\d{3}-\d{4}\b/g;
const SSN = /\b\d{3}-\d{2}-\d{4}\b/g;

export function scrub(input: string): string {
  return input
    .replace(EMAIL, '[redacted]')
    .replace(PHONE, '[redacted]')
    .replace(SSN, '[redacted]');
}
