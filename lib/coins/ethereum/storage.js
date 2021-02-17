"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LocalTxStorage = void 0;
var LocalTxStorage = /** @class */ (function () {
    function LocalTxStorage(prefix) {
        this.prefix = prefix;
    }
    LocalTxStorage.prototype.add = function (address, tx) {
        var txs = this.list(address);
        txs.unshift(tx);
        localStorage.setItem(this.prefix + "." + address, JSON.stringify(txs));
    };
    LocalTxStorage.prototype.list = function (address) {
        var data = localStorage.getItem(this.prefix + "." + address);
        if (!data) {
            return [];
        }
        return JSON.parse(data);
    };
    return LocalTxStorage;
}());
exports.LocalTxStorage = LocalTxStorage;
//# sourceMappingURL=storage.js.map