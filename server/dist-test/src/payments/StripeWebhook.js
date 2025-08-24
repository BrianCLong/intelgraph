"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyStripeSig = verifyStripeSig;
exports.handleWebhook = handleWebhook;
const crypto_1 = __importDefault(require("crypto"));
function verifyStripeSig(payload, header, secret) {
    const parts = header.split(',');
    const t = parts[0].split('=')[1];
    const v1 = parts[1].split('=')[1];
    const sig = crypto_1.default.createHmac('sha256', secret).update(`${t}.${payload}`).digest('hex');
    if (sig !== v1)
        throw new Error('stripe_sig_invalid');
    return { ts: Number(t), ok: true };
}
async function handleWebhook(evt, deps) {
    const id = evt.id;
    if (deps.idempotency) {
        if (deps.idempotency.has(id))
            return { idempotent: true };
        deps.idempotency.add(id);
    }
    if (evt.type === 'payment_intent.succeeded') {
        const orderId = evt.data.object.metadata.orderId;
        await deps.orders.markPaid(orderId);
        const ent = await deps.entitlements.issueFromOrder(orderId);
        await deps.transparency.appendIssue(ent.id);
    }
    else if (evt.type === 'charge.refunded') {
        const orderId = evt.data.object.metadata.orderId;
        const entId = await deps.orders.findEntitlement(orderId);
        await deps.entitlements.revoke(entId);
        await deps.transparency.appendRevoke(entId);
    }
    return { handled: true };
}
//# sourceMappingURL=StripeWebhook.js.map