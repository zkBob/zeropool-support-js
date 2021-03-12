"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LocalTxStorage = void 0;
var LocalTxStorage = /** @class */ (function () {
    function LocalTxStorage(prefix) {
        this.prefix = prefix;
    }
    LocalTxStorage.prototype.add = function (coin, address, tx) {
        var txs = this.list(coin, address);
        txs.unshift(tx);
        localStorage.setItem(this.prefix + "." + coin + "." + address, JSON.stringify(txs));
    };
    LocalTxStorage.prototype.list = function (coin, address) {
        var data = localStorage.getItem(this.prefix + "." + coin + "." + address);
        if (!data) {
            return [];
        }
        return JSON.parse(data);
    };
    return LocalTxStorage;
}());
exports.LocalTxStorage = LocalTxStorage;
//# sourceMappingURL=tx-storage.js.map