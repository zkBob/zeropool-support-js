"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const config_1 = require("./coins/waves/config");
const config = {
    near: {
        networkId: 'mainnet',
        nodeUrl: 'https://rpc.mainnet.near.org',
        walletUrl: 'https://wallet.near.org',
        helperUrl: 'https://helper.mainnet.near.org',
        explorerUrl: 'https://explorer.mainnet.near.org',
    },
    ethereum: {
        httpProviderUrl: 'https://main-rpc.linkpool.io',
        relayerUrl: 'http://localhost:3000',
        contractAddress: '',
        tokenContractAddress: '',
    },
    waves: {
        nodeUrl: 'https://nodes.wavesplatform.com',
        chainId: config_1.ChainId.Mainnet,
    },
    snarkParams: {
        transferParamsUrl: 'transfer_params.bin',
        treeParamsUrl: 'tree_update_params.bin',
        transferVkUrl: 'transfer_verification_key.json',
        treeVkUrl: 'tree_verification_key.json'
    },
    wasmPath: '',
    workerPath: ''
};
exports.default = config;
//# sourceMappingURL=config.prod.js.map