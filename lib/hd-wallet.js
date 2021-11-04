var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { CoinType } from './coins/coin-type';
import { NearCoin } from './coins/near';
import { EthereumCoin } from './coins/ethereum';
import { WavesCoin } from './coins/waves';
import { Params } from 'libzeropool-rs-wasm-bundler';
import { ZeroPoolState } from './zp/state';
import { DirectBackend } from './coins/ethereum/backends/direct';
import Web3 from 'web3';
import { deriveSpendingKey } from './utils';
export class HDWallet {
    constructor() {
        this.coins = {};
    }
    static init(seed, config, coinTypes) {
        return __awaiter(this, void 0, void 0, function* () {
            const wallet = new HDWallet();
            const txParamsData = yield (yield fetch(config.snarkParams.transferParamsUrl)).arrayBuffer();
            const transferParams = Params.fromBinary(new Uint8Array(txParamsData));
            const treeParamsData = yield (yield fetch(config.snarkParams.treeParamsUrl)).arrayBuffer();
            const treeParams = Params.fromBinary(new Uint8Array(treeParamsData));
            wallet.snarkParams = {
                transferParams,
                treeParams,
                transferVk: config.snarkParams.transferVk,
                treeVk: config.snarkParams.treeVk,
            };
            wallet.seed = seed;
            wallet.config = config;
            const promises = coinTypes.map(coin => wallet.enableCoin(coin));
            yield Promise.all(promises);
            return wallet;
        });
    }
    getRegularAddress(coinType, account) {
        var _a;
        return (_a = this.getCoin(coinType)) === null || _a === void 0 ? void 0 : _a.getAddress(account);
    }
    getRegularPrivateKey(coinType, account) {
        var _a;
        return (_a = this.getCoin(coinType)) === null || _a === void 0 ? void 0 : _a.getPrivateKey(account);
    }
    getBalances(numAccounts, offset = 0) {
        return __awaiter(this, void 0, void 0, function* () {
            const promises = Object.entries(this.coins).map(([coinType, coin]) => {
                return coin.getBalances(numAccounts, offset)
                    .then((balances) => [coinType, balances]);
            });
            const pairs = yield Promise.all(promises);
            return pairs.reduce((balances, [coinType, balance]) => {
                balances[coinType] = balance;
                return balances;
            }, {});
        });
    }
    enableCoin(coinType) {
        return __awaiter(this, void 0, void 0, function* () {
            let coin;
            switch (coinType) {
                case CoinType.near: {
                    coin = new NearCoin(this.seed, this.config.near);
                    break;
                }
                case CoinType.ethereum: {
                    // TODO: Encapsulate backend selection and key derivation?
                    const sk = deriveSpendingKey(this.seed);
                    const state = yield ZeroPoolState.create(sk, CoinType.ethereum, BigInt(1000000000)); // FIXME: Replace with a constant
                    const web3 = new Web3(this.config.ethereum.httpProviderUrl);
                    const backend = new DirectBackend(web3, this.snarkParams, this.config.ethereum, state);
                    coin = new EthereumCoin(this.seed, web3, this.config.ethereum, backend);
                    break;
                }
                case CoinType.waves: {
                    coin = new WavesCoin(this.seed, this.config.waves);
                    break;
                }
                default: {
                    throw new Error(`CoinType ${coinType} is not implemented`);
                }
            }
            yield coin.ready();
            this.coins[coinType] = coin;
        });
    }
    disableCoin(coin) {
        delete this.coins[coin];
    }
    getCoin(coinType) {
        return this.coins[coinType];
    }
}
//# sourceMappingURL=hd-wallet.js.map