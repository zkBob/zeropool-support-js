"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TronClient = void 0;
const client_1 = require("../client");
const TronWeb = require('tronweb');
class TronClient extends client_1.Client {
    constructor(rpc, privateKey, config) {
        super();
        this.tronWeb = new TronWeb({
            fullHost: rpc,
            privateKey
        });
        this.address = TronWeb.address.fromPrivateKey(this.truncateHexPrefix(privateKey));
        this.transactionUrl = config.transactionUrl;
    }
    haltClient() {
    }
    // ------------------=========< Getting common data >=========-------------------
    // | ChainID, token name, token decimals                                        |
    // ------------------------------------------------------------------------------
    async getChainId() {
        throw new Error("Method not implemented.");
    }
    getTokenName(tokenAddress) {
        throw new Error("Method not implemented.");
    }
    decimals(tokenAddress) {
        throw new Error("Method not implemented.");
    }
    // ------------------=========< Conversion routines >=========-------------------
    // | Between base units and human-readable                                      |
    // ------------------------------------------------------------------------------
    baseUnit() {
        return 'sun';
    }
    toBaseUnit(humanAmount) {
        return TronWeb.toSun(Number(humanAmount));
    }
    fromBaseUnit(baseAmount) {
        return TronWeb.fromSun(baseAmount);
    }
    async toBaseTokenUnit(tokenAddress, humanAmount) {
        return humanAmount; // TODO
    }
    async fromBaseTokenUnit(tokenAddress, baseAmount) {
        return baseAmount; // TODO
    }
    // ----------------=========< Fetching address info >=========-------------------
    // | Native&token balances, nonces, etc                                         |
    // ------------------------------------------------------------------------------
    async getAddress() {
        return this.address;
    }
    async getBalance() {
        return String(await this.tronWeb.trx.getBalance(await this.getAddress()));
    }
    async getTokenBalance(tokenAddress) {
        let abi = [{ "outputs": [{ "type": "uint256" }], "constant": true, "inputs": [{ "name": "who", "type": "address" }], "name": "balanceOf", "stateMutability": "View", "type": "Function" }, { "outputs": [{ "type": "bool" }], "inputs": [{ "name": "_to", "type": "address" }, { "name": "_value", "type": "uint256" }], "name": "transfer", "stateMutability": "Nonpayable", "type": "Function" }];
        let contract = await this.tronWeb.contract(abi, tokenAddress);
        let result = await contract.balanceOf(await this.getAddress()).call();
        return result.toString(10);
    }
    async getTokenNonce(tokenAddress) {
        throw new Error("Method not implemented.");
    }
    async allowance(tokenAddress, spender) {
        throw new Error("Method not implemented.");
    }
    // ------------=========< Active blockchain interaction >=========---------------
    // | All actions related to the transaction sending                             |
    // ------------------------------------------------------------------------------
    async estimateTxFee() {
        throw new Error("Method not implemented.");
    }
    async sendTransaction(to, amount, data) {
        throw new Error("Method not implemented.");
    }
    async transfer(to, amount) {
        throw new Error("Method not implemented.");
    }
    transferToken(tokenAddress, to, amount) {
        throw new Error("Method not implemented.");
    }
    async approve(tokenAddress, spender, amount) {
        throw new Error("Method not implemented.");
    }
    async increaseAllowance(tokenAddress, spender, additionalAmount) {
        throw new Error("Method not implemented.");
    }
    // Private routines
    truncateHexPrefix(data) {
        if (data.startsWith('0x')) {
            data = data.slice(2);
        }
        return data;
    }
}
exports.TronClient = TronClient;
//# sourceMappingURL=client.js.map