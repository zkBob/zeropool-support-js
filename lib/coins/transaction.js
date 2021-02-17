"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TxFee = exports.Transaction = exports.TxStatus = void 0;
var TxStatus;
(function (TxStatus) {
    TxStatus[TxStatus["Completed"] = 0] = "Completed";
    TxStatus[TxStatus["Pending"] = 1] = "Pending";
    TxStatus[TxStatus["Error"] = 2] = "Error";
})(TxStatus = exports.TxStatus || (exports.TxStatus = {}));
var Transaction = /** @class */ (function () {
    function Transaction() {
    }
    return Transaction;
}());
exports.Transaction = Transaction;
var TxFee = /** @class */ (function () {
    function TxFee() {
    }
    return TxFee;
}());
exports.TxFee = TxFee;
//# sourceMappingURL=transaction.js.map