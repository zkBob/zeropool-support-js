"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EvmNetwork = void 0;
const bn_js_1 = __importDefault(require("bn.js"));
const network_1 = require("../network");
const network_type_1 = require("../network-type");
const transaction_1 = require("../transaction");
const utils_1 = require("./utils");
const storage_1 = require("./storage");
const account_1 = require("./account");
const token_abi_json_1 = __importDefault(require("./token-abi.json"));
// TODO: Organize presistent state properly
const TX_STORAGE_PREFIX = 'zeropool.eth-txs';
class EvmNetwork extends network_1.Network {
    constructor(mnemonic, web3, config, state, zpBackend, worker) {
        super(mnemonic, state, worker);
        this.web3 = web3;
        this.txStorage = new storage_1.LocalTxStorage(TX_STORAGE_PREFIX);
        this.accounts = new account_1.AccountCache(mnemonic, this.web3);
        this.token = new this.web3.eth.Contract(token_abi_json_1.default);
        this.config = config;
        this.zp = zpBackend;
    }
    getPrivateKey(account) {
        return this.accounts.getOrCreate(account).account.privateKey;
    }
    getPublicKey(account) {
        return this.accounts.getOrCreate(account).keypair.publicKey.toString('hex');
    }
    getAddress(account) {
        return this.accounts.getOrCreate(account).account.address;
    }
    async getBalance(account) {
        return await this.web3.eth.getBalance(this.getAddress(account));
    }
    async getTokenBalance(account, tokenAddress) {
        const address = this.getAddress(account);
        const balance = await this.zp.getTokenBalance(address, tokenAddress);
        return balance;
    }
    async transferToken(account, tokenAddress, to, amount) {
        const from = this.getAddress(account);
        const nonce = await this.web3.eth.getTransactionCount(this.getAddress(account));
        const gas = await this.web3.eth.estimateGas({ from, to, value: amount });
        const gasPrice = await this.web3.eth.getGasPrice();
        const data = this.token.methods.transfer(to, amount).encodeABI();
        const raw = {
            nonce,
            gas,
            gasPrice,
            to: tokenAddress,
            value: 0,
            data,
        };
        const signed = await this.web3.eth.accounts.signTransaction(raw, this.getPrivateKey(account));
        const receipt = await this.web3.eth.sendSignedTransaction(signed.rawTransaction);
        const block = await this.web3.eth.getBlock(receipt.blockNumber);
        let timestamp;
        if (typeof block.timestamp == 'string') {
            timestamp = parseInt(block.timestamp);
        }
        else {
            timestamp = block.timestamp;
        }
        let status = transaction_1.TxStatus.Completed;
        if (!receipt.status) {
            status = transaction_1.TxStatus.Error;
        }
        const nativeTx = await this.web3.eth.getTransaction(receipt.transactionHash);
        const tx = (0, utils_1.convertTransaction)(nativeTx, timestamp, status);
        this.txStorage.add(this.getAddress(account), tx);
    }
    async transfer(account, to, amount) {
        const from = this.getAddress(account);
        const nonce = await this.web3.eth.getTransactionCount(this.getAddress(account));
        const gas = await this.web3.eth.estimateGas({ from, to, value: amount });
        const gasPrice = await this.web3.eth.getGasPrice();
        const signed = await this.web3.eth.accounts.signTransaction({
            from,
            to,
            value: amount,
            nonce,
            gas,
            gasPrice,
        }, this.getPrivateKey(account));
        const receipt = await this.web3.eth.sendSignedTransaction(signed.rawTransaction);
        const block = await this.web3.eth.getBlock(receipt.blockNumber);
        let timestamp;
        if (typeof block.timestamp == 'string') {
            timestamp = parseInt(block.timestamp);
        }
        else {
            timestamp = block.timestamp;
        }
        let status = transaction_1.TxStatus.Completed;
        if (!receipt.status) {
            status = transaction_1.TxStatus.Error;
        }
        const nativeTx = await this.web3.eth.getTransaction(receipt.transactionHash);
        const tx = (0, utils_1.convertTransaction)(nativeTx, timestamp, status);
        this.txStorage.add(this.getAddress(account), tx);
    }
    async getTransactions(account, limit, offset) {
        const numTx = await this.web3.eth.getTransactionCount(this.getAddress(account));
        if (numTx === 0) {
            return [];
        }
        const txs = this.txStorage.list(this.getAddress(account));
        return txs.slice(offset, offset + limit);
    }
    /**
     * Converts ether to Wei.
     * @param amount in Ether
     */
    toBaseUnit(amount) {
        return this.web3.utils.toWei(amount, 'ether');
    }
    /**
     * Converts Wei to ether.
     * @param amount in Wei
     */
    fromBaseUnit(amount) {
        return this.web3.utils.fromWei(amount, 'ether');
    }
    async estimateTxFee() {
        const gas = await this.web3.eth.estimateGas({
            from: this.getAddress(0),
            to: this.getAddress(0),
            value: this.toBaseUnit('1'),
        });
        const gasPrice = await this.web3.eth.getGasPrice();
        const fee = new bn_js_1.default(gas).mul(new bn_js_1.default(gasPrice));
        return {
            gas: gas.toString(),
            gasPrice,
            fee: this.fromBaseUnit(fee.toString()),
        };
    }
    getNetworkType() {
        return network_type_1.NetworkType.ethereum;
    }
    async mint(account, tokenAddress, amount) {
        const privateKey = this.getPrivateKey(account);
        return this.zp.mint(tokenAddress, privateKey, amount);
    }
    async transferShielded(tokenAddress, outs) {
        return this.zp.transfer(tokenAddress, outs);
    }
    async depositShielded(account, tokenAddress, amount) {
        const privateKey = this.getPrivateKey(account);
        return this.zp.deposit(tokenAddress, privateKey, amount);
    }
    async withdrawShielded(account, tokenAddress, amount) {
        const privateKey = this.getPrivateKey(account);
        return this.zp.withdraw(tokenAddress, privateKey, amount);
    }
    getShieldedBalance() {
        return this.zp.getTotalBalance();
    }
    getShieldedBalances() {
        return this.zp.getBalances();
    }
    async updateState() {
        for (let address of Object.keys(this.config.tokens)) {
            await this.zp.updateState(address); // FIXME: Separate instances per token
        }
    }
    free() {
        this.zp.free();
    }
}
exports.EvmNetwork = EvmNetwork;
//# sourceMappingURL=network.js.map