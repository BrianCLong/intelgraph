"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const StripeWebhook_1 = require("../payments/StripeWebhook");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
describe('StripeWebhook', () => {
    it('verifies signature', () => {
        const payload = '{}';
        const secret = 'whsec_test';
        const ts = '12345';
        const sig = require('crypto')
            .createHmac('sha256', secret)
            .update(`${ts}.${payload}`)
            .digest('hex');
        const header = `t=${ts},v1=${sig}`;
        expect((0, StripeWebhook_1.verifyStripeSig)(payload, header, secret).ok).toBe(true);
    });
    it('handles idempotent payment and refund', async () => {
        const succeeded = JSON.parse(fs_1.default.readFileSync(path_1.default.join(__dirname, 'fixtures/payments/payment_intent_succeeded.json'), 'utf8'));
        const refunded = JSON.parse(fs_1.default.readFileSync(path_1.default.join(__dirname, 'fixtures/payments/charge_refunded.json'), 'utf8'));
        const calls = [];
        const deps = {
            orders: {
                markPaid: async (id) => calls.push(`paid:${id}`),
                findEntitlement: async (id) => `${id}-ent`,
            },
            entitlements: {
                issueFromOrder: async (id) => ({ id: `${id}-ent` }),
                revoke: async (id) => calls.push(`revoked:${id}`),
            },
            transparency: {
                appendIssue: async (id) => calls.push(`issue:${id}`),
                appendRevoke: async (id) => calls.push(`revoke:${id}`),
            },
            idempotency: new Set(),
        };
        await (0, StripeWebhook_1.handleWebhook)(succeeded, deps);
        await (0, StripeWebhook_1.handleWebhook)(succeeded, deps); // idempotent
        await (0, StripeWebhook_1.handleWebhook)(refunded, deps);
        expect(calls).toEqual([
            'paid:order123',
            'issue:order123-ent',
            'revoke:order123-ent',
            'revoked:order123-ent',
        ]);
    });
});
//# sourceMappingURL=payments_webhook.test.js.map