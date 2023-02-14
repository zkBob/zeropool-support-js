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
const minter_abi_json_1 = __importDefault(require("./minter-abi.json"));
const pool_abi_json_1 = __importDefault(require("./pool-abi.json"));
const client_1 = require("../../networks/client");
const bs58 = require('bs58');
class EthereumClient extends client_1.Client {
    constructor(provider, config = { transactionUrl: '{{hash}}' }) {
        super();
        this.gasMultiplier = 1.0;
        this.web3 = new web3_1.default(provider);
        this.token = new this.web3.eth.Contract(token_abi_json_1.default);
        this.minter = new this.web3.eth.Contract(minter_abi_json_1.default);
        this.pool = new this.web3.eth.Contract(pool_abi_json_1.default);
        this.transactionUrl = config.transactionUrl;
    }
    async getChainId() {
        return (await this.web3.eth.net.getId());
    }
    async getAddress() {
        return (await this.web3.eth.getAccounts())[0];
    }
    async getBalance() {
        return await this.web3.eth.getBalance(await this.getAddress());
    }
    async getTokenBalance(tokenAddress) {
        const address = await this.getAddress();
        this.token.options.address = tokenAddress; // TODO: Is it possible to pass the contract address to the `call` method?
        const balance = this.token.methods.balanceOf(address).call();
        return balance;
    }
    async getTokenNonce(tokenAddress) {
        const address = await this.getAddress();
        this.token.options.address = tokenAddress;
        const nonce = this.token.methods.nonces(address).call();
        return nonce;
    }
    async getTokenName(tokenAddress) {
        this.token.options.address = tokenAddress;
        const name = this.token.methods.name().call();
        return name;
    }
    async transfer(to, amount) {
        const from = await this.getAddress();
        const nonce = await this.web3.eth.getTransactionCount(from);
        const gas = await this.web3.eth.estimateGas({ from, to, value: amount });
        const gasPrice = await this.web3.eth.getGasPrice();
        const signed = await this.web3.eth.signTransaction({
            from,
            to,
            value: amount,
            nonce,
            gas,
            gasPrice: BigInt(Math.ceil(Number(gasPrice) * this.gasMultiplier)).toString(),
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
        return receipt.transactionHash;
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
        const address = await this.getAddress();
        const gas = await this.web3.eth.estimateGas({
            from: address,
            to: address,
            value: this.toBaseUnit('1'),
        });
        const gasPrice = Number(await this.web3.eth.getGasPrice());
        const fee = new bn_js_1.default(gas).mul(new bn_js_1.default(gasPrice));
        return {
            gas: gas.toString(),
            gasPrice: BigInt(Math.ceil(gasPrice * this.gasMultiplier)).toString(),
            fee: this.fromBaseUnit(fee.toString()),
        };
    }
    async mint(minterAddress, amount) {
        const address = await this.getAddress();
        const encodedTx = await this.token.methods.mint(address, BigInt(amount)).encodeABI();
        var txObject = {
            from: address,
            to: minterAddress,
            data: encodedTx,
        };
        const gas = await this.web3.eth.estimateGas(txObject);
        const gasPrice = Number(await this.web3.eth.getGasPrice());
        const nonce = await this.web3.eth.getTransactionCount(address);
        txObject.gas = gas;
        txObject.gasPrice = `0x${BigInt(Math.ceil(gasPrice * this.gasMultiplier)).toString(16)}`;
        txObject.nonce = nonce;
        const signedTx = await this.web3.eth.signTransaction(txObject);
        const receipt = await this.web3.eth.sendSignedTransaction(signedTx.raw);
        return receipt.transactionHash;
    }
    async transferToken(tokenAddress, to, amount) {
        const address = await this.getAddress();
        const encodedTx = await this.token.methods.transfer(to, BigInt(amount)).encodeABI();
        var txObject = {
            from: address,
            to: tokenAddress,
            data: encodedTx,
        };
        const gas = await this.web3.eth.estimateGas(txObject);
        const gasPrice = Number(await this.web3.eth.getGasPrice());
        const nonce = await this.web3.eth.getTransactionCount(address);
        txObject.gas = gas;
        txObject.gasPrice = `0x${BigInt(Math.ceil(gasPrice * this.gasMultiplier)).toString(16)}`;
        txObject.nonce = nonce;
        const signedTx = await this.web3.eth.signTransaction(txObject);
        const receipt = await this.web3.eth.sendSignedTransaction(signedTx.raw);
        return receipt.transactionHash;
    }
    async approve(tokenAddress, spender, amount) {
        const address = await this.getAddress();
        const encodedTx = await this.token.methods.approve(spender, BigInt(amount)).encodeABI();
        var txObject = {
            from: address,
            to: tokenAddress,
            data: encodedTx,
        };
        const gas = await this.web3.eth.estimateGas(txObject);
        const gasPrice = Number(await this.web3.eth.getGasPrice());
        const nonce = await this.web3.eth.getTransactionCount(address);
        txObject.gas = gas;
        txObject.gasPrice = `0x${BigInt(Math.ceil(gasPrice * this.gasMultiplier)).toString(16)}`;
        txObject.nonce = nonce;
        const signedTx = await this.web3.eth.signTransaction(txObject);
        const receipt = await this.web3.eth.sendSignedTransaction(signedTx.raw);
        return receipt.transactionHash;
    }
    async increaseAllowance(tokenAddress, spender, additionalAmount) {
        const address = await this.getAddress();
        const encodedTx = await this.token.methods.increaseAllowance(spender, BigInt(additionalAmount)).encodeABI();
        var txObject = {
            from: address,
            to: tokenAddress,
            data: encodedTx,
        };
        const gas = await this.web3.eth.estimateGas(txObject);
        const gasPrice = Number(await this.web3.eth.getGasPrice());
        const nonce = await this.web3.eth.getTransactionCount(address);
        txObject.gas = gas;
        txObject.gasPrice = `0x${BigInt(Math.ceil(gasPrice * this.gasMultiplier)).toString(16)}`;
        txObject.nonce = nonce;
        const signedTx = await this.web3.eth.signTransaction(txObject);
        const receipt = await this.web3.eth.sendSignedTransaction(signedTx.raw);
        return receipt.transactionHash;
    }
    async allowance(tokenAddress, spender) {
        const owner = await this.getAddress();
        this.token.options.address = tokenAddress;
        const nonce = await this.token.methods.allowance(owner, spender).call();
        return BigInt(nonce);
    }
    async directDeposit(poolAddress, amount, zkAddress) {
        const address = await this.getAddress();
        const zkAddrBytes = Buffer.from(bs58.decode(zkAddress)).toString('hex');
        const encodedTx = await this.pool.methods.directDeposit(address, BigInt(amount), bs58.decode(zkAddress)).encodeABI();
        var txObject = {
            from: address,
            to: poolAddress,
            data: encodedTx,
        };
        const gas = await this.web3.eth.estimateGas(txObject);
        const gasPrice = Number(await this.web3.eth.getGasPrice());
        const nonce = await this.web3.eth.getTransactionCount(address);
        txObject.gas = gas;
        txObject.gasPrice = `0x${BigInt(Math.ceil(gasPrice * this.gasMultiplier)).toString(16)}`;
        txObject.nonce = nonce;
        const signedTx = await this.web3.eth.signTransaction(txObject);
        const receipt = await this.web3.eth.sendSignedTransaction(signedTx.raw);
        return receipt.transactionHash;
    }
    async sign(data) {
        const address = await this.getAddress();
        const signature = await this.web3.eth.sign(data, address);
        return signature;
    }
    async signTypedData(data) {
        const address = await this.getAddress();
        const provider = this.web3.currentProvider;
        const signPromise = new Promise((resolve, reject) => {
            if (typeof provider != 'string' && typeof (provider === null || provider === void 0 ? void 0 : provider.send) != 'undefined') {
                provider.send({ method: 'eth_signTypedData_v4', params: [data, address.toLowerCase()], jsonrpc: '2.0' }, function (error, result) {
                    if (error) {
                        reject(error);
                    }
                    if (result === null || result === void 0 ? void 0 : result.result) {
                        resolve(result.result);
                    }
                    else {
                        reject('Unable to sign: ' + (result === null || result === void 0 ? void 0 : result.error));
                    }
                });
            }
            else {
                reject(Error('Incorrect provider'));
            }
        });
        return signPromise;
    }
}
exports.EthereumClient = EthereumClient;
//# sourceMappingURL=client.js.map