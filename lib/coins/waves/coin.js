var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { Observable } from 'rxjs';
import { nodeInteraction, broadcast, transfer } from "@waves/waves-transactions";
import { create } from '@waves/node-api-js';
import { Coin } from '../coin';
import { CoinType } from '../coin-type';
import { TxStatus } from '../transaction';
import { AccountCache } from './account';
const POLL_INTERVAL = 10 * 60 * 1000;
const TX_LIMIT = 10;
export class WavesCoin extends Coin {
    constructor(mnemonic, config) {
        super(mnemonic);
        this.lastTxTimestamps = [];
        this.mnemonic = mnemonic;
        this.config = config;
        this.api = create(config.nodeUrl);
        this.accounts = new AccountCache(mnemonic, config.chainId);
    }
    getPrivateKey(account) {
        return this.accounts.getOrCreate(account).privateKey;
    }
    getPublicKey(account) {
        return this.accounts.getOrCreate(account).publicKey;
    }
    getAddress(account) {
        return this.accounts.getOrCreate(account).address;
    }
    getBalance(account) {
        return __awaiter(this, void 0, void 0, function* () {
            const balance = yield nodeInteraction.balance(this.getAddress(account), this.config.nodeUrl);
            return balance.toString();
        });
    }
    transfer(account, to, amount) {
        return __awaiter(this, void 0, void 0, function* () {
            const txParams = {
                recipient: to,
                amount,
            };
            const transferTx = transfer(txParams, { privateKey: this.getPrivateKey(account) });
            yield broadcast(transferTx, this.config.nodeUrl);
        });
    }
    getTransactions(account, limit = 10, offset = 0) {
        return __awaiter(this, void 0, void 0, function* () {
            const address = this.getAddress(account);
            // TODO: Find a more efficient way to fetch the transaction log with an offset
            let txList = yield this.api.transactions.fetchTransactions(address, offset + limit);
            return txList.slice(offset, offset + limit).map((transaction) => {
                const tx = transaction; // FIXME: type handling, there are multiple types of tx
                let to, from;
                if (tx.recipient) {
                    to = tx.recipient;
                    from = tx.sender;
                }
                else if (tx.sender === address) {
                    to = tx.sender;
                    from = address;
                }
                else {
                    to = address;
                    from = tx.sender;
                }
                return {
                    hash: tx.id,
                    blockHash: '',
                    status: TxStatus.Completed,
                    amount: tx.amount,
                    from,
                    to,
                    timestamp: tx.timestamp,
                };
            });
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
    toBaseUnit(amount) {
        return (parseFloat(amount) * 10000000).toString();
    }
    fromBaseUnit(amount) {
        return (parseInt(amount) / 10000000).toString();
    }
    // TODO: Estimate fee for private transactions
    estimateTxFee() {
        return __awaiter(this, void 0, void 0, function* () {
            return {
                gas: '1',
                gasPrice: '100000',
                fee: '100000',
            };
        });
    }
    getCoinType() {
        return CoinType.waves;
    }
}
//# sourceMappingURL=coin.js.map