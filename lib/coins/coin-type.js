export const ZEROPOOL_PURPOSE = 2448;
// Using strings here for better debuggability
export var CoinType;
(function (CoinType) {
    CoinType["ethereum"] = "ethereum";
    CoinType["near"] = "near";
    CoinType["waves"] = "waves";
})(CoinType || (CoinType = {}));
(function (CoinType) {
    function derivationPath(coin, account) {
        return CoinType.chainPath(coin) + CoinType.accountPath(coin, account);
    }
    CoinType.derivationPath = derivationPath;
    function chainPath(coin) {
        return `m/44'/${CoinType.coinNumber(coin)}'`;
    }
    CoinType.chainPath = chainPath;
    function privateDerivationPath(coin) {
        return `m/${ZEROPOOL_PURPOSE}'/${CoinType.coinNumber(coin)}'`;
    }
    CoinType.privateDerivationPath = privateDerivationPath;
    function accountPath(coin, account) {
        switch (coin) {
            case CoinType.ethereum:
                return `/0'/0/${account}`;
            case CoinType.near:
                return `/${account}'`;
            case CoinType.waves:
                return `/${account}'/0'/0'`;
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
})(CoinType || (CoinType = {}));
//# sourceMappingURL=coin-type.js.map