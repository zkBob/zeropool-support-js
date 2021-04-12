export var ChainId;
(function (ChainId) {
    ChainId["Mainnet"] = "Mainnet";
    ChainId["Testnet"] = "Testnet";
    ChainId["Stagenet"] = "Stagenet";
})(ChainId || (ChainId = {}));
(function (ChainId) {
    function chainIdNumber(chainId) {
        switch (chainId) {
            case ChainId.Mainnet:
                return 87;
            case ChainId.Testnet:
                return 84;
            case ChainId.Stagenet:
                return 83;
        }
    }
    ChainId.chainIdNumber = chainIdNumber;
})(ChainId || (ChainId = {}));
//# sourceMappingURL=config.js.map