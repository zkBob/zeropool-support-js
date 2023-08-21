"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TronClient = void 0;
const client_1 = require("../client");
const TronWeb = require('tronweb');
class TronClient extends client_1.Client {
    constructor(rpc, privateKey) {
        super();
        this.tronWeb = new TronWeb({
            fullHost: rpc,
            headers: { 'TRON-PRO-API-KEY': 'a659133c-224a-4438-89de-1575c4e5a59e' },
            privateKey
        });
        this.address = TronWeb.address.fromPrivateKey(this.truncateHexPrefix(privateKey));
    }
    async getAddress() {
        return this.address;
    }
    async getBalance() {
        return String(await this.tronWeb.trx.getBalance(await this.getAddress()));
    }
    async transfer(to, amount) {
        throw new Error("Method not implemented.");
    }
    async toBaseUnit(tokenAddress, amount) {
        throw new Error("Method not implemented.");
    }
    async fromBaseUnit(tokenAddress, amount) {
        throw new Error("Method not implemented.");
    }
    truncateHexPrefix(data) {
        if (data.startsWith('0x')) {
            data = data.slice(2);
        }
        return data;
    }
}
exports.TronClient = TronClient;
//# sourceMappingURL=client.js.map