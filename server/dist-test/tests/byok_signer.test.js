"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Signer_1 = require("../products/Signer");
describe('KmsSigner', () => {
    it('signs and verifies using client', async () => {
        const client = {
            sign: async (id, data) => data,
            verify: async (id, data, sig) => Buffer.compare(data, sig) === 0,
        };
        const signer = new Signer_1.KmsSigner('kid1', client);
        const payload = Buffer.from('hello');
        const sig = await signer.sign(payload);
        expect(await signer.verify(payload, sig)).toBe(true);
        expect(signer.kid()).toBe('kid1');
    });
});
//# sourceMappingURL=byok_signer.test.js.map