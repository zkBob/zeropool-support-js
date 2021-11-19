import Web3 from 'web3';
import { CoinType } from './coins/coin-type';
import { NearCoin } from './coins/near';
import { EthereumCoin } from './coins/ethereum';
import { WavesCoin } from './coins/waves';
import { Params } from './libzeropool-rs';
import { ZeroPoolState } from './zp/state';
import { DirectBackend } from './coins/ethereum/backends/direct';
import { deriveSpendingKey } from './utils';
export class HDWallet {
    constructor() {
        this.coins = {};
    }
    static async init(seed, config, coinTypes) {
        const wallet = new HDWallet();
        const txParamsData = await (await fetch(config.snarkParams.transferParamsUrl)).arrayBuffer();
        const transferParams = Params.fromBinary(new Uint8Array(txParamsData));
        const treeParamsData = await (await fetch(config.snarkParams.treeParamsUrl)).arrayBuffer();
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
            case CoinType.near: {
                coin = new NearCoin(this.seed, this.config.near);
                break;
            }
            case CoinType.ethereum: {
                // TODO: Encapsulate backend selection and key derivation?
                const sk = deriveSpendingKey(this.seed);
                const state = await ZeroPoolState.create(sk, CoinType.ethereum, BigInt(1000000000)); // FIXME: Replace with a constant
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
//# sourceMappingURL=hd-wallet.js.map