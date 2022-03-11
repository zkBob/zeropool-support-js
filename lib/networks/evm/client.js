"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EthereumClient = void 0;
const web3_1 = __importDefault(require("web3"));
const bn_js_1 = __importDefault(require("bn.js"));
const transaction_1 = require("../../networks/transaction");
const utils_1 = require("./utils");
const token_abi_json_1 = __importDefault(require("./token-abi.json"));
const client_1 = require("../../networks/client");
class EthereumClient extends client_1.Client {
    constructor(provider) {
        super();
        this.web3 = new web3_1.default(provider);
        this.token = new this.web3.eth.Contract(token_abi_json_1.default);
    }
    getAddress() {
        return this.web3.eth.getAccounts()[0];
    }
    async getBalance() {
        return await this.web3.eth.getBalance(this.getAddress());
    }
    async getTokenBalance(tokenAddress) {
        const address = this.getAddress();
        this.token.options.address = tokenAddress; // TODO: Is it possible to pass the contract address to the `call` method?
        const balance = this.token.methods.balanceOf(address).call();
        return balance;
    }
    async transferToken(tokenAddress, to, amount) {
        const from = this.getAddress();
        const nonce = await this.web3.eth.getTransactionCount(this.getAddress());
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
        const signed = await this.web3.eth.signTransaction(raw);
        const receipt = await this.web3.eth.sendSignedTransaction(signed.raw);
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
        (0, utils_1.convertTransaction)(nativeTx, timestamp, status);
    }
    async transfer(to, amount) {
        const from = this.getAddress();
        const nonce = await this.web3.eth.getTransactionCount(from);
        const gas = await this.web3.eth.estimateGas({ from, to, value: amount });
        const gasPrice = await this.web3.eth.getGasPrice();
        const signed = await this.web3.eth.signTransaction({
            from,
            to,
            value: amount,
            nonce,
            gas,
            gasPrice,
        });
        const receipt = await this.web3.eth.sendSignedTransaction(signed.raw);
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
        (0, utils_1.convertTransaction)(nativeTx, timestamp, status);
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
            from: this.getAddress(),
            to: this.getAddress(),
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
    async mint(tokenAddress, amount) {
        const address = this.getAddress();
        const encodedTx = await this.token.methods.mint(address, BigInt(amount)).encodeABI();
        var txObject = {
            from: address,
            to: tokenAddress,
            data: encodedTx,
        };
        const gas = await this.web3.eth.estimateGas(txObject);
        const gasPrice = BigInt(await this.web3.eth.getGasPrice());
        const nonce = await this.web3.eth.getTransactionCount(address);
        txObject.gas = gas;
        txObject.gasPrice = `0x${gasPrice.toString(16)}`;
        txObject.nonce = nonce;
        const signedTx = await this.web3.eth.signTransaction(txObject);
        await this.web3.eth.sendSignedTransaction(signedTx.raw);
    }
    async sign(data) {
        const address = this.getAddress();
        const signature = await this.web3.eth.sign(data, address);
        return signature;
    }
}
exports.EthereumClient = EthereumClient;
//# sourceMappingURL=client.js.map