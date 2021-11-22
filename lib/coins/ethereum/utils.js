"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toCanonicalSignature = exports.toCompactSignature = exports.convertTransaction = exports.CONSTANTS = void 0;
const transaction_1 = require("../transaction");
// TODO: getConstants is unusable if the wasm module is not loaded yet.
exports.CONSTANTS = {
    HEIGHT: 48,
    IN: 3,
    OUT: (1 << 7) - 1,
    OUTLOG: 7
};
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
function toCompactSignature(signature) {
    let v = signature.substr(130, 2);
    if (v == "1c") {
        return `${signature.slice(0, 66)}${(parseInt(signature[66], 16) | 8).toString(16)}${signature.slice(67, 130)}`;
    }
    else if (v != "1b") {
        throw ("invalid signature: v should be 27 or 28");
    }
    return signature;
}
exports.toCompactSignature = toCompactSignature;
function toCanonicalSignature(signature) {
    let v = "1c";
    if (parseInt(signature[66], 16) > 7) {
        v = "1e";
    }
    return signature + v;
}
exports.toCanonicalSignature = toCanonicalSignature;
//# sourceMappingURL=utils.js.map