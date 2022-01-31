"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const _1 = require(".");
const config_1 = require("./networks/waves/config");
const config = {
    networks: {
        [_1.NetworkType.near]: {
            networkId: 'default',
            nodeUrl: 'https://rpc.testnet.near.org',
            explorerUrl: 'https://explorer.testnet.near.org',
            tokens: {},
        },
        [_1.NetworkType.ethereum]: {
            httpProviderUrl: 'https://localhost:8535',
            tokens: {},
        },
        [_1.NetworkType.waves]: {
            nodeUrl: 'https://nodes-testnet.wavesnodes.com',
            chainId: config_1.ChainId.Testnet,
            tokens: {},
        },
    },
    snarkParams: {
        transferParamsUrl: 'transfer_params.bin',
        treeParamsUrl: 'tree_update_params.bin',
        transferVkUrl: 'transfer_verification_key.json',
        treeVkUrl: 'tree_update_verification_key.json'
    },
    wasmPath: '',
    workerPath: 'worker.js'
};
exports.default = config;
//# sourceMappingURL=config.dev.js.map