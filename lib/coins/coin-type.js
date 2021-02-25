"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CoinType = void 0;
var CoinType;
(function (CoinType) {
    CoinType[CoinType["ethereum"] = 60] = "ethereum";
    CoinType[CoinType["near"] = 397] = "near";
})(CoinType = exports.CoinType || (exports.CoinType = {}));
(function (CoinType) {
    function derivationPath(coin, account) {
        return CoinType.chainPath(coin) + CoinType.accountPath(coin, account);
    }
    CoinType.derivationPath = derivationPath;
    function chainPath(coin) {
        switch (coin) {
            case CoinType.ethereum:
                return "m/44'/60'";
            case CoinType.near:
                return "m/44'/397'";
        }
    }
    CoinType.chainPath = chainPath;
    function accountPath(coin, account) {
        switch (coin) {
            case CoinType.ethereum:
                return "/" + account + "'/0/0";
            case CoinType.near:
                return "/" + account + "'";
        }
    }
    CoinType.accountPath = accountPath;
})(CoinType = exports.CoinType || (exports.CoinType = {}));
//# sourceMappingURL=coin-type.js.map