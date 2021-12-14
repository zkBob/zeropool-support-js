"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NearCoin = void 0;
const bs58_1 = __importDefault(require("bs58"));
const bn_js_1 = __importDefault(require("bn.js"));
const format_1 = require("near-api-js/lib/utils/format");
const key_stores_1 = require("near-api-js/lib/key_stores");
const providers_1 = require("near-api-js/lib/providers");
const coin_1 = require("../coin");
const coin_type_1 = require("../coin-type");
const transaction_1 = require("../transaction");
const account_1 = require("./account");
class NearCoin extends coin_1.Coin {
    constructor(mnemonic, config, state, worker) {
        super(mnemonic, state, worker);
        this.lastTxTimestamps = [];
        this.mnemonic = mnemonic;
        this.keyStore = new key_stores_1.InMemoryKeyStore();
        this.config = config;
        this.accounts = new account_1.AccountCache();
        this.rpc = new providers_1.JsonRpcProvider(this.config.nodeUrl);
    }
    getPrivateKey(account) {
        const keypair = this.accounts.getOrCreate(this.mnemonic, account).keypair;
        return 'ed25519:' + bs58_1.default.encode(keypair.secretKey);
    }
    getPublicKey(account) {
        const keypair = this.accounts.getOrCreate(this.mnemonic, account).keypair;
        return 'ed25519:' + bs58_1.default.encode(keypair.getPublicKey().data);
    }
    getAddress(account) {
        const keypair = this.accounts.getOrCreate(this.mnemonic, account).keypair;
        return Buffer.from(keypair.getPublicKey().data).toString('hex');
    }
    async getBalance(accountIndex) {
        const account = await this.accounts.getOrInit(this.mnemonic, accountIndex, this.config, this.keyStore);
        const balance = await account.account.getAccountBalance();
        return balance.available;
    }
    /**
     * @param to
     * @param amount in yoctoNEAR
     */
    async transfer(accountIndex, to, amount) {
        const account = await this.accounts.getOrInit(this.mnemonic, accountIndex, this.config, this.keyStore);
        await account.account.sendMoney(to, new bn_js_1.default(amount));
    }
    async getTransactions(accountIndex, limit, offset) {
        const url = new URL(`/account/${this.getAddress(accountIndex)}/activity`, this.config.explorerUrl);
        if (limit) {
            url.searchParams.append('limit', limit.toString());
        }
        if (offset) {
            url.searchParams.append('offset', offset.toString());
        }
        const res = await fetch(url.toString());
        const json = await res.json();
        let txs = [];
        for (const action of json) {
            // Convert timestamp to seconds since near presents it in nanoseconds
            const timestamp = parseInt(action.block_timestamp) / 1000000;
            if (action['action_kind'] == 'TRANSFER') {
                txs.push({
                    status: transaction_1.TxStatus.Completed,
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
    }
    async fetchNewTransactions(account, limit, offset) {
        const txs = await this.getTransactions(account, limit, offset);
        const txIdx = txs.findIndex(tx => tx.timestamp === this.lastTxTimestamps[account]);
        if (txIdx == -1) {
            const otherTxs = await this.fetchNewTransactions(account, limit, offset + limit);
            txs.concat(otherTxs);
            return txs;
        }
        else if (txIdx > 0) {
            return txs.slice(0, txIdx);
        }
        return [];
    }
    /**
     * Convert human-readable NEAR to yoctoNEAR
     **/
    toBaseUnit(amount) {
        return (0, format_1.parseNearAmount)(amount);
    }
    /**
    * Convert yoctoNEAR to human-readable NEAR
    **/
    fromBaseUnit(amount) {
        return (0, format_1.formatNearAmount)(amount);
    }
    async estimateTxFee() {
        const account = await this.accounts.getOrInit(this.mnemonic, 0, this.config, this.keyStore);
        const status = await account.account.connection.provider.status();
        const latestBlock = status.sync_info.latest_block_hash;
        const res = await this.rpc.gasPrice(latestBlock);
        const gasPrice = new bn_js_1.default(res.gas_price);
        const gas = new bn_js_1.default('30000000000000');
        const fee = gas.mul(gasPrice).toString();
        const feeFormatted = (0, format_1.formatNearAmount)(fee);
        return {
            gas: gas.toString(),
            gasPrice: gasPrice.toString(),
            fee: feeFormatted,
        };
    }
    getCoinType() {
        return coin_type_1.CoinType.near;
    }
}
exports.NearCoin = NearCoin;
//# sourceMappingURL=coin.js.map