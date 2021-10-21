var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import bs58 from 'bs58';
import BN from 'bn.js';
import { Observable } from 'rxjs';
import { formatNearAmount, parseNearAmount } from 'near-api-js/lib/utils/format';
import { InMemoryKeyStore } from 'near-api-js/lib/key_stores';
import { JsonRpcProvider } from 'near-api-js/lib/providers';
import { Coin } from '../coin';
import { TxStatus } from '../transaction';
import { AccountCache } from './account';
import { CoinType } from '../coin-type';
const POLL_INTERVAL = 10 * 60 * 1000;
const TX_LIMIT = 10;
export class NearCoin extends Coin {
    constructor(mnemonic, config) {
        super(mnemonic);
        this.lastTxTimestamps = [];
        this.mnemonic = mnemonic;
        this.keyStore = new InMemoryKeyStore();
        this.config = config;
        this.accounts = new AccountCache();
        this.rpc = new JsonRpcProvider(this.config.nodeUrl);
    }
    getPrivateKey(account) {
        const keypair = this.accounts.getOrCreate(this.mnemonic, account).keypair;
        return 'ed25519:' + bs58.encode(keypair.secretKey);
    }
    getPublicKey(account) {
        const keypair = this.accounts.getOrCreate(this.mnemonic, account).keypair;
        return 'ed25519:' + bs58.encode(keypair.getPublicKey().data);
    }
    getAddress(account) {
        const keypair = this.accounts.getOrCreate(this.mnemonic, account).keypair;
        return Buffer.from(keypair.getPublicKey().data).toString('hex');
    }
    getBalance(accountIndex) {
        return __awaiter(this, void 0, void 0, function* () {
            const account = yield this.accounts.getOrInit(this.mnemonic, accountIndex, this.config, this.keyStore);
            const balance = yield account.account.getAccountBalance();
            return balance.available;
        });
    }
    /**
     * @param to
     * @param amount in yoctoNEAR
     */
    transfer(accountIndex, to, amount) {
        return __awaiter(this, void 0, void 0, function* () {
            const account = yield this.accounts.getOrInit(this.mnemonic, accountIndex, this.config, this.keyStore);
            yield account.account.sendMoney(to, new BN(amount));
        });
    }
    getTransactions(accountIndex, limit, offset) {
        return __awaiter(this, void 0, void 0, function* () {
            const url = new URL(`/account/${this.getAddress(accountIndex)}/activity`, this.config.explorerUrl);
            if (limit) {
                url.searchParams.append('limit', limit.toString());
            }
            if (offset) {
                url.searchParams.append('offset', offset.toString());
            }
            const res = yield fetch(url.toString());
            const json = yield res.json();
            let txs = [];
            for (const action of json) {
                // Convert timestamp to seconds since near presents it in nanoseconds
                const timestamp = parseInt(action.block_timestamp) / 1000000;
                if (action['action_kind'] == 'TRANSFER') {
                    txs.push({
                        status: TxStatus.Completed,
                        amount: action.args.deposit,
                        from: action.signer_id,
                        to: action.receiver_id,
                        timestamp: timestamp,
                        blockHash: action.block_hash,
                        hash: action.hash,
                    });
                }
            }
            return txs;
        });
    }
    subscribe(account) {
        return __awaiter(this, void 0, void 0, function* () {
            const latestTxs = yield this.getTransactions(1);
            if (latestTxs.length == 1) {
                this.lastTxTimestamps[account] = latestTxs[0].timestamp;
            }
            return new Observable(subscriber => {
                const interval = setInterval(() => __awaiter(this, void 0, void 0, function* () {
                    try {
                        const txs = yield this.fetchNewTransactions(account, TX_LIMIT, 0);
                        for (const tx of txs) {
                            subscriber.next(tx);
                        }
                    }
                    catch (e) {
                        subscriber.error(e);
                    }
                }), POLL_INTERVAL);
                return function unsubscribe() {
                    clearInterval(interval);
                };
            });
        });
    }
    fetchNewTransactions(account, limit, offset) {
        return __awaiter(this, void 0, void 0, function* () {
            const txs = yield this.getTransactions(account, limit, offset);
            const txIdx = txs.findIndex(tx => tx.timestamp === this.lastTxTimestamps[account]);
            if (txIdx == -1) {
                const otherTxs = yield this.fetchNewTransactions(account, limit, offset + limit);
                txs.concat(otherTxs);
                return txs;
            }
            else if (txIdx > 0) {
                return txs.slice(0, txIdx);
            }
            return [];
        });
    }
    /**
     * Convert human-readable NEAR to yoctoNEAR
     **/
    toBaseUnit(amount) {
        return parseNearAmount(amount);
    }
    /**
    * Convert yoctoNEAR to human-readable NEAR
    **/
    fromBaseUnit(amount) {
        return formatNearAmount(amount);
    }
    estimateTxFee() {
        return __awaiter(this, void 0, void 0, function* () {
            const account = yield this.accounts.getOrInit(this.mnemonic, 0, this.config, this.keyStore);
            const status = yield account.account.connection.provider.status();
            const latestBlock = status.sync_info.latest_block_hash;
            const res = yield this.rpc.gasPrice(latestBlock);
            const gasPrice = new BN(res.gas_price);
            const gas = new BN('30000000000000');
            const fee = gas.mul(gasPrice).toString();
            const feeFormatted = formatNearAmount(fee);
            return {
                gas: gas.toString(),
                gasPrice: gasPrice.toString(),
                fee: feeFormatted,
            };
        });
    }
    getCoinType() {
        return CoinType.near;
    }
}
//# sourceMappingURL=coin.js.map