"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HDWallet = void 0;
const web3_1 = __importDefault(require("web3"));
const coin_type_1 = require("./coins/coin-type");
const near_1 = require("./coins/near");
const ethereum_1 = require("./coins/ethereum");
const waves_1 = require("./coins/waves");
const libzeropool_rs_1 = require("./libzeropool-rs");
const state_1 = require("./zp/state");
const direct_1 = require("./coins/ethereum/backends/direct");
const utils_1 = require("./utils");
class HDWallet {
    constructor() {
        this.coins = {};
    }
    static async init(seed, config, coinTypes) {
        const wallet = new HDWallet();
        const txParamsData = await (await fetch(config.snarkParams.transferParamsUrl)).arrayBuffer();
        const transferParams = libzeropool_rs_1.Params.fromBinary(new Uint8Array(txParamsData));
        const treeParamsData = await (await fetch(config.snarkParams.treeParamsUrl)).arrayBuffer();
        const treeParams = libzeropool_rs_1.Params.fromBinary(new Uint8Array(treeParamsData));
        wallet.snarkParams = {
            transferParams,
            treeParams,
            transferVk: config.snarkParams.transferVk,
            treeVk: config.snarkParams.treeVk,
        };
        wallet.seed = seed;
        wallet.config = config;
        const promises = coinTypes.map(coin => wallet.enableCoin(coin));
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
    async enableCoin(coinType) {
        let coin;
        switch (coinType) {
            case coin_type_1.CoinType.near: {
                coin = new near_1.NearCoin(this.seed, this.config.near);
                break;
            }
            case coin_type_1.CoinType.ethereum: {
                // TODO: Encapsulate backend selection and key derivation?
                const sk = (0, utils_1.deriveSpendingKey)(this.seed, coin_type_1.CoinType.ethereum);
                const state = await state_1.ZeroPoolState.create(sk, coin_type_1.CoinType.ethereum, BigInt(1000000000)); // FIXME: Replace with a constant
                const web3 = new web3_1.default(this.config.ethereum.httpProviderUrl);
                const backend = new direct_1.DirectBackend(web3, this.snarkParams, this.config.ethereum, state);
                coin = new ethereum_1.EthereumCoin(this.seed, web3, this.config.ethereum, backend);
                break;
            }
            case coin_type_1.CoinType.waves: {
                coin = new waves_1.WavesCoin(this.seed, this.config.waves);
                break;
            }
            default: {
                throw new Error(`CoinType ${coinType} is not implemented`);
            }
        }
        await coin.ready();
        this.coins[coinType] = coin;
    }
    disableCoin(coin) {
        delete this.coins[coin];
    }
    getCoin(coinType) {
        return this.coins[coinType];
    }
}
exports.HDWallet = HDWallet;
//# sourceMappingURL=hd-wallet.js.map