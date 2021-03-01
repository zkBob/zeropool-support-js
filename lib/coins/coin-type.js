"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CoinType = void 0;
// Using strings here for better debuggability
var CoinType;
(function (CoinType) {
    CoinType["ethereum"] = "ethereum";
    CoinType["near"] = "near";
    CoinType["waves"] = "waves";
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
            case CoinType.waves:
                return "m/44'/5741564'";
        }
    }
    CoinType.chainPath = chainPath;
    function accountPath(coin, account) {
        switch (coin) {
            case CoinType.ethereum:
                return "/" + account + "'/0/0";
            case CoinType.near:
                return "/" + account + "'";
            case CoinType.waves:
                return "/" + account + "'/0'/0'";
        }
    }
    CoinType.accountPath = accountPath;
    function coinNumber(coin) {
        switch (coin) {
            case CoinType.ethereum:
                return 60;
            case CoinType.near:
                return 397;
            case CoinType.waves:
                return 5741564;
        }
    }
    CoinType.coinNumber = coinNumber;
})(CoinType = exports.CoinType || (exports.CoinType = {}));
//# sourceMappingURL=coin-type.js.map