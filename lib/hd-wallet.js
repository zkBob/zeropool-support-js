"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HDWallet = void 0;
const web3_1 = __importDefault(require("web3"));
const comlink_1 = require("comlink");
const coin_type_1 = require("./coins/coin-type");
const near_1 = require("./coins/near");
const ethereum_1 = require("./coins/ethereum");
const waves_1 = require("./coins/waves");
const libzeropool_rs_1 = require("./libzeropool-rs");
const state_1 = require("./state");
const relayer_1 = require("./coins/ethereum/relayer");
const utils_1 = require("./utils");
const file_cache_1 = require("./file-cache");
class HDWallet {
    constructor() {
        this.coins = {};
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
        for (let coinType in coin_type_1.CoinType) {
            if (config[coinType]) {
                promises.push(wallet.enableCoin(coinType, config[coinType]));
            }
        }
        await Promise.all(promises);
        return wallet;
    }
    getRegularAddress(coinType, account) {
        var _a;
        return (_a = this.getCoin(coinType)) === null || _a === void 0 ? void 0 : _a.getAddress(account);
    }
    getRegularPrivateKey(coinType, account) {
        var _a;
        return (_a = this.getCoin(coinType)) === null || _a === void 0 ? void 0 : _a.getPrivateKey(account);
    }
    async getBalances(numAccounts, offset = 0) {
        const promises = Object.entries(this.coins).map(([coinType, coin]) => {
            return coin.getBalances(numAccounts, offset)
                .then((balances) => [coinType, balances]);
        });
        const pairs = await Promise.all(promises);
        return pairs.reduce((balances, [coinType, balance]) => {
            balances[coinType] = balance;
            return balances;
        }, {});
    }
    async enableCoin(coinType, config) {
        let coin;
        switch (coinType) {
            case coin_type_1.CoinType.near: {
                const sk = (0, utils_1.deriveSpendingKey)(this.seed, coin_type_1.CoinType.ethereum);
                const state = await state_1.ZeroPoolState.create(sk, coin_type_1.CoinType.near, BigInt(1000000000));
                coin = new near_1.NearCoin(this.seed, config, state, this.worker);
                break;
            }
            case coin_type_1.CoinType.ethereum: {
                // TODO: Encapsulate backend selection and key derivation?
                const sk = (0, utils_1.deriveSpendingKey)(this.seed, coin_type_1.CoinType.ethereum);
                const state = await state_1.ZeroPoolState.create(sk, coin_type_1.CoinType.ethereum, BigInt(1000000000));
                const web3 = new web3_1.default(config.httpProviderUrl);
                const backend = new relayer_1.RelayerBackend(new URL(config.relayerUrl), web3, state, this.snarkParams, config, this.worker);
                coin = new ethereum_1.EthereumCoin(this.seed, web3, config, state, backend, this.worker);
                break;
            }
            case coin_type_1.CoinType.waves: {
                const sk = (0, utils_1.deriveSpendingKey)(this.seed, coin_type_1.CoinType.waves);
                const state = await state_1.ZeroPoolState.create(sk, coin_type_1.CoinType.near, BigInt(1000000000));
                coin = new waves_1.WavesCoin(this.seed, config, state, this.worker);
                break;
            }
            default: {
                throw new Error(`CoinType ${coinType} is not implemented`);
            }
        }
        this.coins[coinType] = coin;
    }
    disableCoin(coin) {
        if (this.coins[coin]) {
            this.getCoin(coin).free();
            delete this.coins[coin];
        }
    }
    getCoin(coinType) {
        return this.coins[coinType];
    }
    free() {
        for (const key of Object.keys(this.coins)) {
            this.coins[key].free();
        }
    }
}
exports.HDWallet = HDWallet;
//# sourceMappingURL=hd-wallet.js.map