import { nodeInteraction, broadcast, transfer } from "@waves/waves-transactions";
import { create } from '@waves/node-api-js';
import { Coin } from "../coin";
import { CoinType } from "../coin-type";
import { TxStatus } from "../transaction";
import { AccountCache } from './account';
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
    async getBalance(account) {
        const balance = await nodeInteraction.balance(this.getAddress(account), this.config.nodeUrl);
        return balance.toString();
    }
    async transfer(account, to, amount) {
        const txParams = {
            recipient: to,
            amount,
        };
        const transferTx = transfer(txParams, { privateKey: this.getPrivateKey(account) });
        await broadcast(transferTx, this.config.nodeUrl);
    }
    async getTransactions(account, limit = 10, offset = 0) {
        const address = this.getAddress(account);
        // TODO: Find a more efficient way to fetch the transaction log with an offset
        let txList = await this.api.transactions.fetchTransactions(address, offset + limit);
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
    }
    toBaseUnit(amount) {
        return (parseFloat(amount) * 10000000).toString();
    }
    fromBaseUnit(amount) {
        return (parseInt(amount) / 10000000).toString();
    }
    // TODO: Estimate fee for private transactions
    async estimateTxFee() {
        return {
            gas: '1',
            gasPrice: '100000',
            fee: '100000',
        };
    }
    getCoinType() {
        return CoinType.waves;
    }
}
//# sourceMappingURL=coin.js.map