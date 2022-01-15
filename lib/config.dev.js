"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const config_1 = require("./networks/waves/config");
const config = {
    near: {
        networkId: 'default',
        nodeUrl: 'https://rpc.testnet.near.org',
        explorerUrl: 'https://explorer.testnet.near.org',
    },
    ethereum: {
        httpProviderUrl: 'https://localhost:8535',
    },
    waves: {
        nodeUrl: 'https://nodes-testnet.wavesnodes.com',
        chainId: config_1.ChainId.Testnet,
    },
    snarkParams: {
        transferParamsUrl: 'transfer_params.bin',
        treeParamsUrl: 'tree_update_params.bin',
        transferVkUrl: 'transfer_verification_key.json',
        treeVkUrl: 'tree_update_verification_key.json'
    },
    networks: {},
    wasmPath: '',
    workerPath: 'worker.js'
};
exports.default = config;
//# sourceMappingURL=config.dev.js.map