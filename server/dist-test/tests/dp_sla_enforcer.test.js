"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const SlaEnforcer_1 = require("../privacy/dp/SlaEnforcer");
describe('SlaEnforcer', () => {
    it('credits and pauses on breach', async () => {
        const actions = [];
        const enforcer = new SlaEnforcer_1.SlaEnforcer({
            orders: { credit: async (id) => actions.push(`credit:${id}`) },
            entitlements: { pause: async (id) => actions.push(`pause:${id}`) },
        });
        const res = await enforcer.check(5, 1, 'ent1', 'ord1');
        expect(res.refunded).toBe(true);
        expect(actions).toEqual(['credit:ord1', 'pause:ent1']);
    });
});
//# sourceMappingURL=dp_sla_enforcer.test.js.map