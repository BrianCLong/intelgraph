"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.KmsSigner = void 0;
class KmsSigner {
    constructor(keyId, client) {
        this.keyId = keyId;
        this.client = client;
    }
    sign(p) {
        return this.client.sign(this.keyId, p);
    }
    verify(p, s) {
        return this.client.verify(this.keyId, p, s);
    }
    kid() {
        return this.keyId;
    }
}
exports.KmsSigner = KmsSigner;
//# sourceMappingURL=Signer.js.map