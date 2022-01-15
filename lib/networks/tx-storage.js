"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LocalTxStorage = void 0;
class LocalTxStorage {
    constructor(prefix) {
        this.prefix = prefix;
    }
    add(coin, address, tx) {
        const txs = this.list(coin, address);
        txs.unshift(tx);
        localStorage.setItem(`${this.prefix}.${coin}.${address}`, JSON.stringify(txs));
    }
    list(coin, address) {
        const data = localStorage.getItem(`${this.prefix}.${coin}.${address}`);
        if (!data) {
            return [];
        }
        return JSON.parse(data);
    }
}
exports.LocalTxStorage = LocalTxStorage;
//# sourceMappingURL=tx-storage.js.map