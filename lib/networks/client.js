"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Client = void 0;
class Client {
    constructor() {
        this.transactionUrl = '{{hash}}';
    }
    // getting neccessary data from the blockchain
    getChainId() { throw new Error('unimplemented'); }
    ;
    getTransactionUrl(hash) { return this.transactionUrl.replace('{{hash}}', hash); }
    ;
    getPublicKey() { throw new Error('unimplemented'); }
    getTokenNonce(tokenAddress) { throw new Error('unimplemented'); }
    allowance(tokenAddress, spender) { throw new Error('unimplemented'); }
    // active blockchain interaction
    estimateTxFee(txObject) { throw new Error('unimplemented'); }
    sendTransaction(to, amount, data, selector) { throw new Error('unimplemented'); }
    approve(tokenAddress, spender, amount) { throw new Error('unimplemented'); }
    increaseAllowance(tokenAddress, spender, additionalAmount) { throw new Error('unimplemented'); }
    mint(tokenAddres, amount) { throw new Error('unimplemented'); }
    // signatures
    sign(data) { throw new Error('unimplemented'); }
    signTypedData(data) { throw new Error('unimplemented'); }
    // high-level routines
    getDirectDepositContract(poolAddress) { throw new Error('unimplemented'); }
    directDeposit(poolAddress, amount, zkAddress) { throw new Error('unimplemented'); }
}
exports.Client = Client;
//# sourceMappingURL=client.js.map