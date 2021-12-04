"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const config_1 = require("./coins/waves/config");
const config = {
    near: {
        networkId: 'default',
        nodeUrl: 'https://rpc.testnet.near.org',
        walletUrl: 'https://wallet.testnet.near.org',
        helperUrl: 'https://helper.testnet.near.org',
        explorerUrl: 'https://explorer.testnet.near.org',
    },
    ethereum: {
        httpProviderUrl: 'https://localhost:8535',
        relayerUrl: 'http://localhost:3000',
        contractAddress: '',
        contractBlock: 0,
        tokenContractAddress: '',
    },
    waves: {
        nodeUrl: 'https://nodes-testnet.wavesnodes.com',
        chainId: config_1.ChainId.Testnet,
    },
    snarkParams: {
        transferParamsUrl: 'transfer_params.bin',
        treeParamsUrl: 'tree_update_params.bin',
    },
    wasmPath: '',
    workerPath: ''
};
exports.default = config;
//# sourceMappingURL=config.dev.js.map