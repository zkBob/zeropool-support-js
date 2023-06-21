"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Client = void 0;
class Client {
    constructor() {
        this.transactionUrl = '{{hash}}';
    }
    getPublicKey() {
        throw new Error('unimplemented');
    }
    getChainId() {
        throw new Error('unimplemented');
    }
    ;
    getTokenBalance(tokenAddress) {
        throw new Error('unimplemented');
    }
    getTokenNonce(tokenAddress) {
        throw new Error('unimplemented');
    }
    getTokenName(tokenAddress) {
        throw new Error('unimplemented');
    }
    transferToken(tokenAddress, to, amount) {
        throw new Error('unimplemented');
    }
    mint(tokenAddres, amount) {
        throw new Error('unimplemented');
    }
    approve(tokenAddress, spender, amount) {
        throw new Error('unimplemented');
    }
    increaseAllowance(tokenAddress, spender, additionalAmount) {
        throw new Error('unimplemented');
    }
    allowance(tokenAddress, spender) {
        throw new Error('unimplemented');
    }
    async getDirectDepositContract(poolAddress) {
        throw new Error('unimplemented');
    }
    directDeposit(poolAddress, amount, zkAddress) {
        throw new Error('unimplemented');
    }
    getTransactionUrl(hash) {
        return this.transactionUrl.replace('{{hash}}', hash);
    }
    async decimals(tokenAddress) {
        throw new Error('unimplemented');
    }
    /**
     * Get estimated transaction fee.
     */
    estimateTxFee() {
        throw new Error('unimplemented');
    }
    async sign(data) {
        throw new Error('unimplemented');
    }
    async signTypedData(data) {
        throw new Error('unimplemented');
    }
}
exports.Client = Client;
//# sourceMappingURL=client.js.map