"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HDWallet = void 0;
const web3_1 = __importDefault(require("web3"));
const comlink_1 = require("comlink");
const network_type_1 = require("./networks/network-type");
const near_1 = require("./networks/near");
const evm_1 = require("./networks/evm");
const waves_1 = require("./networks/waves");
const libzeropool_rs_1 = require("./libzeropool-rs");
const state_1 = require("./state");
const relayer_1 = require("./networks/evm/relayer");
const utils_1 = require("./utils");
const file_cache_1 = require("./file-cache");
class HDWallet {
    constructor() {
        this.networks = {};
    }
    static async init(seed, config) {
        const wallet = new HDWallet();
        const cache = await file_cache_1.FileCache.init();
        const txParamsData = await cache.getOrCache(config.snarkParams.transferParamsUrl);
        const transferParams = libzeropool_rs_1.Params.fromBinary(new Uint8Array(txParamsData));
        const treeParamsData = await cache.getOrCache(config.snarkParams.treeParamsUrl);
        const treeParams = libzeropool_rs_1.Params.fromBinary(new Uint8Array(treeParamsData));
        const transferVk = await (await fetch(config.snarkParams.transferVkUrl)).json();
        const treeVk = await (await fetch(config.snarkParams.treeVkUrl)).json();
        const worker = (0, comlink_1.wrap)(new Worker(config.workerPath));
        await worker.initWasm(config.wasmPath, {
            txParams: config.snarkParams.transferParamsUrl,
            treeParams: config.snarkParams.treeParamsUrl,
        });
        wallet.snarkParams = {
            transferParams,
            treeParams,
            transferVk,
            treeVk,
        };
        wallet.seed = seed;
        wallet.config = config;
        wallet.worker = worker;
        const promises = [];
        for (let networkType in network_type_1.NetworkType) {
            if (config.networks[networkType]) {
                promises.push(wallet.enableNetwork(networkType, config.networks[networkType]));
            }
        }
        await Promise.all(promises);
        return wallet;
    }
    getRegularAddress(networkType, account) {
        var _a;
        return (_a = this.getNetwork(networkType)) === null || _a === void 0 ? void 0 : _a.getAddress(account);
    }
    getRegularPrivateKey(networkType, account) {
        var _a;
        return (_a = this.getNetwork(networkType)) === null || _a === void 0 ? void 0 : _a.getPrivateKey(account);
    }
    async getBalances(numAccounts, offset = 0) {
        const promises = Object.entries(this.networks).map(([networkType, network]) => {
            return network.getBalances(numAccounts, offset)
                .then((balances) => [networkType, balances]);
        });
        const pairs = await Promise.all(promises);
        return pairs.reduce((balances, [networkType, balance]) => {
            balances[networkType] = balance;
            return balances;
        }, {});
    }
    async enableNetwork(networkType, config) {
        let network;
        switch (networkType) {
            case network_type_1.NetworkType.near: {
                const sk = (0, utils_1.deriveSpendingKey)(this.seed, network_type_1.NetworkType.ethereum);
                const state = await state_1.ZeroPoolState.create(sk, network_type_1.NetworkType.near, BigInt(1000000000));
                network = new near_1.NearNetwork(this.seed, config, state, this.worker);
                break;
            }
            case network_type_1.NetworkType.ethereum:
            case network_type_1.NetworkType.xdai:
            case network_type_1.NetworkType.aurora: {
                const sk = (0, utils_1.deriveSpendingKey)(this.seed, networkType);
                const state = await state_1.ZeroPoolState.create(sk, networkType, BigInt(1000000000)); // FIXME: use token config
                const web3 = new web3_1.default(config.httpProviderUrl);
                const backend = new relayer_1.RelayerBackend(config.tokens, web3, state, this.snarkParams, this.worker);
                network = new evm_1.EvmNetwork(this.seed, web3, config, state, backend, this.worker);
                break;
            }
            case network_type_1.NetworkType.waves: {
                const sk = (0, utils_1.deriveSpendingKey)(this.seed, network_type_1.NetworkType.waves);
                const state = await state_1.ZeroPoolState.create(sk, network_type_1.NetworkType.near, BigInt(1000000000));
                network = new waves_1.WavesNetwork(this.seed, config, state, this.worker);
                break;
            }
            default: {
                throw new Error(`NetworkType ${networkType} is not implemented`);
            }
        }
        this.networks[networkType] = network;
    }
    disableNetwork(network) {
        if (this.networks[network]) {
            this.getNetwork(network).free();
            delete this.networks[network];
        }
    }
    getNetwork(networkType) {
        return this.networks[networkType];
    }
    free() {
        for (const key of Object.keys(this.networks)) {
            this.networks[key].free();
        }
    }
}
exports.HDWallet = HDWallet;
//# sourceMappingURL=hd-wallet.js.map