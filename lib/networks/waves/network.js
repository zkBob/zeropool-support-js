"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WavesNetwork = void 0;
const waves_transactions_1 = require("@waves/waves-transactions");
const node_api_js_1 = require("@waves/node-api-js");
const network_1 = require("../network");
const network_type_1 = require("../network-type");
const transaction_1 = require("../transaction");
const account_1 = require("./account");
class WavesNetwork extends network_1.Network {
    constructor(mnemonic, config, state, worker) {
        super(mnemonic, state, worker);
        this.lastTxTimestamps = [];
        this.mnemonic = mnemonic;
        this.config = config;
        this.api = (0, node_api_js_1.create)(config.nodeUrl);
        this.accounts = new account_1.AccountCache(mnemonic, config.chainId);
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
        const balance = await waves_transactions_1.nodeInteraction.balance(this.getAddress(account), this.config.nodeUrl);
        return balance.toString();
    }
    async transfer(account, to, amount) {
        const txParams = {
            recipient: to,
            amount,
        };
        const transferTx = (0, waves_transactions_1.transfer)(txParams, { privateKey: this.getPrivateKey(account) });
        await (0, waves_transactions_1.broadcast)(transferTx, this.config.nodeUrl);
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
                status: transaction_1.TxStatus.Completed,
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
    getNetworkType() {
        return network_type_1.NetworkType.waves;
    }
}
exports.WavesNetwork = WavesNetwork;
//# sourceMappingURL=network.js.map