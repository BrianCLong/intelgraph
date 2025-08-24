"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const dataRedaction_1 = require("@/utils/dataRedaction");
describe('redactData', () => {
    const sample = {
        email: 'user@example.com',
        properties: { phone: '1234567890', name: 'Alice' },
    };
    it('redacts PII for viewer role', () => {
        const user = { id: '1', role: 'VIEWER' };
        const redacted = (0, dataRedaction_1.redactData)(sample, user);
        expect(redacted.email).toBe('[REDACTED]');
        expect(redacted.properties.phone).toBe('[REDACTED]');
        expect(redacted.properties.name).toMatch(/^A\*\*\*e$/);
    });
    it('masks PII for analyst role', () => {
        const user = { id: '2', role: 'ANALYST' };
        const redacted = (0, dataRedaction_1.redactData)(sample, user);
        expect(redacted.email).toBe('use***@example.com');
        expect(redacted.properties.phone).toBe('***-***-7890');
    });
});
//# sourceMappingURL=dataRedaction.test.js.map