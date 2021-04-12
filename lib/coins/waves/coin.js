var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
import { Observable } from 'rxjs';
import { nodeInteraction, broadcast, transfer } from "@waves/waves-transactions";
import { create } from '@waves/node-api-js';
import { Coin } from '../coin';
import { CoinType } from '../coin-type';
import { TxStatus } from '../transaction';
import { AccountCache } from './account';
var POLL_INTERVAL = 10 * 60 * 1000;
var TX_LIMIT = 10;
var WavesCoin = /** @class */ (function (_super) {
    __extends(WavesCoin, _super);
    function WavesCoin(mnemonic, config) {
        var _this = _super.call(this, mnemonic) || this;
        _this.lastTxTimestamps = [];
        _this.mnemonic = mnemonic;
        _this.config = config;
        _this.api = create(config.nodeUrl);
        _this.accounts = new AccountCache(mnemonic, config.chainId);
        return _this;
    }
    WavesCoin.prototype.getPrivateKey = function (account) {
        return this.accounts.getOrCreate(account).privateKey;
    };
    WavesCoin.prototype.getPublicKey = function (account) {
        return this.accounts.getOrCreate(account).publicKey;
    };
    WavesCoin.prototype.getAddress = function (account) {
        return this.accounts.getOrCreate(account).address;
    };
    WavesCoin.prototype.getBalance = function (account) {
        return __awaiter(this, void 0, void 0, function () {
            var balance;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, nodeInteraction.balance(this.getAddress(account), this.config.nodeUrl)];
                    case 1:
                        balance = _a.sent();
                        return [2 /*return*/, balance.toString()];
                }
            });
        });
    };
    WavesCoin.prototype.transfer = function (account, to, amount) {
        return __awaiter(this, void 0, void 0, function () {
            var txParams, transferTx;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        txParams = {
                            recipient: to,
                            amount: amount,
                        };
                        transferTx = transfer(txParams, { privateKey: this.getPrivateKey(account) });
                        return [4 /*yield*/, broadcast(transferTx, this.config.nodeUrl)];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    WavesCoin.prototype.getTransactions = function (account, limit, offset) {
        if (limit === void 0) { limit = 10; }
        if (offset === void 0) { offset = 0; }
        return __awaiter(this, void 0, void 0, function () {
            var address, txList;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        address = this.getAddress(account);
                        return [4 /*yield*/, this.api.transactions.fetchTransactions(address, offset + limit)];
                    case 1:
                        txList = _a.sent();
                        return [2 /*return*/, txList.slice(offset, offset + limit).map(function (transaction) {
                                var tx = transaction; // FIXME: type handling, there are multiple types of tx
                                var to, from;
                                if (tx.recipient) {
                                    to = tx.recipient;
                                    from = tx.sender;
                                }
                                else if (tx.sender === address) {
                                    to = tx.sender;
                                    from = address;
                                }
                                else {
                                    to = address;
                                    from = tx.sender;
                                }
                                return {
                                    hash: tx.id,
                                    blockHash: '',
                                    status: TxStatus.Completed,
                                    amount: tx.amount,
                                    from: from,
                                    to: to,
                                    timestamp: tx.timestamp,
                                };
                            })];
                }
            });
        });
    };
    WavesCoin.prototype.subscribe = function (account) {
        return __awaiter(this, void 0, void 0, function () {
            var latestTxs;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.getTransactions(1)];
                    case 1:
                        latestTxs = _a.sent();
                        if (latestTxs.length == 1) {
                            this.lastTxTimestamps[account] = latestTxs[0].timestamp;
                        }
                        return [2 /*return*/, new Observable(function (subscriber) {
                                var interval = setInterval(function () { return __awaiter(_this, void 0, void 0, function () {
                                    var txs, _i, txs_1, tx, e_1;
                                    return __generator(this, function (_a) {
                                        switch (_a.label) {
                                            case 0:
                                                _a.trys.push([0, 2, , 3]);
                                                return [4 /*yield*/, this.fetchNewTransactions(account, TX_LIMIT, 0)];
                                            case 1:
                                                txs = _a.sent();
                                                for (_i = 0, txs_1 = txs; _i < txs_1.length; _i++) {
                                                    tx = txs_1[_i];
                                                    subscriber.next(tx);
                                                }
                                                return [3 /*break*/, 3];
                                            case 2:
                                                e_1 = _a.sent();
                                                subscriber.error(e_1);
                                                return [3 /*break*/, 3];
                                            case 3: return [2 /*return*/];
                                        }
                                    });
                                }); }, POLL_INTERVAL);
                                return function unsubscribe() {
                                    clearInterval(interval);
                                };
                            })];
                }
            });
        });
    };
    WavesCoin.prototype.fetchNewTransactions = function (account, limit, offset) {
        return __awaiter(this, void 0, void 0, function () {
            var txs, txIdx, otherTxs;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.getTransactions(account, limit, offset)];
                    case 1:
                        txs = _a.sent();
                        txIdx = txs.findIndex(function (tx) { return tx.timestamp === _this.lastTxTimestamps[account]; });
                        if (!(txIdx == -1)) return [3 /*break*/, 3];
                        return [4 /*yield*/, this.fetchNewTransactions(account, limit, offset + limit)];
                    case 2:
                        otherTxs = _a.sent();
                        txs.concat(otherTxs);
                        return [2 /*return*/, txs];
                    case 3:
                        if (txIdx > 0) {
                            return [2 /*return*/, txs.slice(0, txIdx)];
                        }
                        _a.label = 4;
                    case 4: return [2 /*return*/, []];
                }
            });
        });
    };
    WavesCoin.prototype.toBaseUnit = function (amount) {
        return (parseFloat(amount) * 10000000).toString();
    };
    WavesCoin.prototype.fromBaseUnit = function (amount) {
        return (parseInt(amount) / 10000000).toString();
    };
    // TODO: Estimate fee for private transactions
    WavesCoin.prototype.estimateTxFee = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, {
                        gas: '1',
                        gasPrice: '100000',
                        fee: '100000',
                    }];
            });
        });
    };
    WavesCoin.prototype.getCoinType = function () {
        return CoinType.waves;
    };
    return WavesCoin;
}(Coin));
export { WavesCoin };
//# sourceMappingURL=coin.js.map