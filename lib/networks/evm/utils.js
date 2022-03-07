"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.convertTransaction = void 0;
const transaction_1 = require("../transaction");
function convertTransaction(tx, timestamp, customStatus) {
    return {
        status: customStatus || transaction_1.TxStatus.Completed,
        amount: tx.value,
        from: tx.from,
        to: tx.to || '',
        timestamp: timestamp,
        blockHash: tx.blockHash || '',
        hash: tx.hash,
    };
}
exports.convertTransaction = convertTransaction;
//# sourceMappingURL=utils.js.map