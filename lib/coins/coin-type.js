"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CoinType = void 0;
var CoinType;
(function (CoinType) {
    CoinType[CoinType["ethereum"] = 60] = "ethereum";
    CoinType[CoinType["near"] = 397] = "near";
})(CoinType = exports.CoinType || (exports.CoinType = {}));
(function (CoinType) {
    function derivationPath(coin, address) {
        switch (coin) {
            case CoinType.ethereum:
                return "m/44'/60'/" + address + "'/0/0";
            case CoinType.near:
                return "m/44'/397'/" + address + "'";
        }
    }
    CoinType.derivationPath = derivationPath;
})(CoinType = exports.CoinType || (exports.CoinType = {}));
//# sourceMappingURL=coin-type.js.map