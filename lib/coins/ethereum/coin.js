"use strict";
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EthereumCoin = void 0;
var web3_1 = __importDefault(require("web3"));
var rxjs_1 = require("rxjs");
var bn_js_1 = __importDefault(require("bn.js"));
var coin_type_1 = require("../coin-type");
var utils_1 = require("../../utils");
var transaction_1 = require("../transaction");
var utils_2 = require("./utils");
var storage_1 = require("./storage");
var TX_CHECK_INTERVAL = 10 * 1000; // TODO: What's the optimal interval for this?
var TX_STORAGE_PREFIX = 'zeropool.eth-txs';
var EthereumCoin = /** @class */ (function () {
    function EthereumCoin(seed, config, account) {
        this.keypair = utils_1.parseMnemonic(seed, coin_type_1.CoinType.ethereum, account);
        this.web3 = new web3_1.default(config.httpProviderUrl);
        this.web3ws = new web3_1.default(config.wsProviderUrl);
        this.txStorage = new storage_1.LocalTxStorage(TX_STORAGE_PREFIX);
        var privateKey = '0x' + this.keypair.privateKey.toString('hex');
        this.account = this.web3.eth.accounts.privateKeyToAccount(privateKey);
    }
    EthereumCoin.prototype.getPrivateKey = function () {
        return this.account.privateKey;
    };
    EthereumCoin.prototype.getPublicKey = function () {
        return this.keypair.publicKey.toString('hex');
    };
    EthereumCoin.prototype.getAddress = function () {
        return this.account.address;
    };
    EthereumCoin.prototype.getBalance = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.web3.eth.getBalance(this.getAddress())];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    EthereumCoin.prototype.transfer = function (to, amount) {
        return __awaiter(this, void 0, void 0, function () {
            var from, nonce, gas, gasPrice, signed, receipt, block, timestamp, status, nativeTx, tx;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        from = this.getAddress();
                        return [4 /*yield*/, this.web3.eth.getTransactionCount(this.getAddress())];
                    case 1:
                        nonce = _a.sent();
                        return [4 /*yield*/, this.web3.eth.estimateGas({ from: from, to: to, value: amount })];
                    case 2:
                        gas = _a.sent();
                        return [4 /*yield*/, this.web3.eth.getGasPrice()];
                    case 3:
                        gasPrice = _a.sent();
                        return [4 /*yield*/, this.web3.eth.accounts.signTransaction({
                                from: from,
                                to: to,
                                value: amount,
                                nonce: nonce,
                                gas: gas,
                                gasPrice: gasPrice,
                            }, this.getPrivateKey())];
                    case 4:
                        signed = _a.sent();
                        return [4 /*yield*/, this.web3.eth.sendSignedTransaction(signed.rawTransaction)];
                    case 5:
                        receipt = _a.sent();
                        return [4 /*yield*/, this.web3.eth.getBlock(receipt.blockNumber)];
                    case 6:
                        block = _a.sent();
                        if (typeof block.timestamp == 'string') {
                            timestamp = parseInt(block.timestamp);
                        }
                        else {
                            timestamp = block.timestamp;
                        }
                        status = transaction_1.TxStatus.Completed;
                        if (!receipt.status) {
                            status = transaction_1.TxStatus.Error;
                        }
                        return [4 /*yield*/, this.web3.eth.getTransaction(receipt.transactionHash)];
                    case 7:
                        nativeTx = _a.sent();
                        tx = utils_2.convertTransaction(nativeTx, timestamp, status);
                        this.txStorage.add(this.getAddress(), tx);
                        return [2 /*return*/];
                }
            });
        });
    };
    EthereumCoin.prototype.getTransactions = function (limit, offset) {
        return __awaiter(this, void 0, void 0, function () {
            var txs;
            return __generator(this, function (_a) {
                txs = this.txStorage.list(this.getAddress());
                return [2 /*return*/, txs.slice(offset, offset + limit)];
            });
        });
    };
    EthereumCoin.prototype.subscribe = function () {
        return __awaiter(this, void 0, void 0, function () {
            var web3, sub, address, obs;
            var _this = this;
            return __generator(this, function (_a) {
                web3 = this.web3;
                sub = this.web3ws.eth.subscribe('pendingTransactions');
                address = this.getAddress();
                obs = new rxjs_1.Observable(function (subscriber) {
                    sub.on('data', function (txHash) { return __awaiter(_this, void 0, void 0, function () {
                        var nativeTx, interval;
                        var _this = this;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0: return [4 /*yield*/, web3.eth.getTransaction(txHash)];
                                case 1:
                                    nativeTx = _a.sent();
                                    if ((nativeTx.to && nativeTx.to.toLowerCase() != address) && nativeTx.from.toLowerCase() != address) {
                                        return [2 /*return*/];
                                    }
                                    interval = setInterval(function () { return __awaiter(_this, void 0, void 0, function () {
                                        var e_1, block, timestamp, tx;
                                        return __generator(this, function (_a) {
                                            switch (_a.label) {
                                                case 0:
                                                    _a.trys.push([0, 2, , 3]);
                                                    return [4 /*yield*/, web3.eth.getTransaction(txHash)];
                                                case 1:
                                                    nativeTx = _a.sent();
                                                    return [3 /*break*/, 3];
                                                case 2:
                                                    e_1 = _a.sent();
                                                    clearInterval(interval);
                                                    return [3 /*break*/, 3];
                                                case 3:
                                                    if (!(nativeTx.transactionIndex !== null)) return [3 /*break*/, 5];
                                                    return [4 /*yield*/, web3.eth.getBlock(nativeTx.blockNumber)];
                                                case 4:
                                                    block = _a.sent();
                                                    timestamp = void 0;
                                                    if (typeof block.timestamp == 'string') {
                                                        timestamp = parseInt(block.timestamp);
                                                    }
                                                    else {
                                                        timestamp = block.timestamp;
                                                    }
                                                    tx = utils_2.convertTransaction(nativeTx, timestamp);
                                                    // Relevant transaction found, update tx cache and notify listeners
                                                    this.txStorage.add(this.getAddress(), tx);
                                                    subscriber.next(tx);
                                                    clearInterval(interval);
                                                    _a.label = 5;
                                                case 5: return [2 /*return*/];
                                            }
                                        });
                                    }); }, TX_CHECK_INTERVAL);
                                    return [2 /*return*/];
                            }
                        });
                    }); })
                        .on('error', function (error) {
                        subscriber.error(error);
                    });
                    return function unsubscribe() {
                        sub.unsubscribe();
                    };
                });
                return [2 /*return*/, obs];
            });
        });
    };
    /**
     * Converts ether to Wei.
     * @param amount in Ether
     */
    EthereumCoin.prototype.toBaseUnit = function (amount) {
        return this.web3.utils.toWei(amount, 'ether');
    };
    /**
     * Converts Wei to ether.
     * @param amount in Wei
     */
    EthereumCoin.prototype.fromBaseUnit = function (amount) {
        return this.web3.utils.fromWei(amount, 'ether');
    };
    EthereumCoin.prototype.estimateTxFee = function () {
        return __awaiter(this, void 0, void 0, function () {
            var gas, gasPrice, fee;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.web3.eth.estimateGas({
                            from: this.getAddress(),
                            to: this.getAddress(),
                            value: this.toBaseUnit('1'),
                        })];
                    case 1:
                        gas = _a.sent();
                        return [4 /*yield*/, this.web3.eth.getGasPrice()];
                    case 2:
                        gasPrice = _a.sent();
                        fee = new bn_js_1.default(gas).mul(new bn_js_1.default(gasPrice));
                        return [2 /*return*/, {
                                gas: gas.toString(),
                                gasPrice: gasPrice,
                                fee: this.fromBaseUnit(fee.toString()),
                            }];
                }
            });
        });
    };
    /**
     * Scans blocks for account transactions (both from and to)
     * @param startBlockNumber
     * @param endBlockNumber
     */
    EthereumCoin.prototype.fetchAccountTransactions = function (startBlockNumber, endBlockNumber) {
        return __awaiter(this, void 0, void 0, function () {
            var address, transactions, i, block, _i, _a, tx, timestamp, newTx;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        address = this.getAddress();
                        transactions = [];
                        i = startBlockNumber;
                        _b.label = 1;
                    case 1:
                        if (!(i >= endBlockNumber)) return [3 /*break*/, 4];
                        return [4 /*yield*/, this.web3.eth.getBlock(i, true)];
                    case 2:
                        block = _b.sent();
                        if (block != null && block.transactions != null) {
                            for (_i = 0, _a = block.transactions; _i < _a.length; _i++) {
                                tx = _a[_i];
                                if (address == tx.from || address == tx.to) {
                                    timestamp = (typeof block.timestamp == 'string') ? parseInt(block.timestamp) : block.timestamp;
                                    newTx = utils_2.convertTransaction(tx, timestamp);
                                    transactions.push(newTx);
                                }
                            }
                        }
                        _b.label = 3;
                    case 3:
                        --i;
                        return [3 /*break*/, 1];
                    case 4: return [2 /*return*/, transactions];
                }
            });
        });
    };
    return EthereumCoin;
}());
exports.EthereumCoin = EthereumCoin;
//# sourceMappingURL=coin.js.map