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
import Web3 from 'web3';
import { Observable } from 'rxjs';
import BN from 'bn.js';
import { Coin } from '../coin';
import { CoinType } from '../coin-type';
import { TxStatus } from '../transaction';
import { convertTransaction } from './utils';
import { LocalTxStorage } from './storage';
import { AccountCache } from './account';
import { EthPrivateTransaction, TxType } from './private-tx';
import { hexToBuf } from '../../utils';
var TX_CHECK_INTERVAL = 10 * 1000;
var TX_STORAGE_PREFIX = 'zeropool.eth-txs';
var MAX_SCAN_TASKS = 100;
var EthereumCoin = /** @class */ (function (_super) {
    __extends(EthereumCoin, _super);
    function EthereumCoin(mnemonic, config, params) {
        var _this = _super.call(this, mnemonic) || this;
        _this.web3 = new Web3(config.httpProviderUrl);
        _this.web3ws = new Web3(config.wsProviderUrl);
        _this.txStorage = new LocalTxStorage(TX_STORAGE_PREFIX);
        _this.accounts = new AccountCache(mnemonic, _this.web3);
        _this.config = config;
        _this.params = params;
        return _this;
    }
    EthereumCoin.prototype.init = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, _super.prototype.init.call(this)];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    EthereumCoin.prototype.getPrivateKey = function (account) {
        return this.accounts.getOrCreate(account).account.privateKey;
    };
    EthereumCoin.prototype.getPublicKey = function (account) {
        return this.accounts.getOrCreate(account).keypair.publicKey.toString('hex');
    };
    EthereumCoin.prototype.getAddress = function (account) {
        return this.accounts.getOrCreate(account).account.address;
    };
    EthereumCoin.prototype.getBalance = function (account) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.web3.eth.getBalance(this.getAddress(account))];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    EthereumCoin.prototype.transfer = function (account, to, amount) {
        return __awaiter(this, void 0, void 0, function () {
            var from, nonce, gas, gasPrice, signed, receipt, block, timestamp, status, nativeTx, tx;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        from = this.getAddress(account);
                        return [4 /*yield*/, this.web3.eth.getTransactionCount(this.getAddress(account))];
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
                            }, this.getPrivateKey(account))];
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
                        status = TxStatus.Completed;
                        if (!receipt.status) {
                            status = TxStatus.Error;
                        }
                        return [4 /*yield*/, this.web3.eth.getTransaction(receipt.transactionHash)];
                    case 7:
                        nativeTx = _a.sent();
                        tx = convertTransaction(nativeTx, timestamp, status);
                        this.txStorage.add(this.getAddress(account), tx);
                        return [2 /*return*/];
                }
            });
        });
    };
    EthereumCoin.prototype.getTransactions = function (account, limit, offset) {
        return __awaiter(this, void 0, void 0, function () {
            var numTx, txs;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.web3.eth.getTransactionCount(this.getAddress(account))];
                    case 1:
                        numTx = _a.sent();
                        if (numTx === 0) {
                            return [2 /*return*/, []];
                        }
                        txs = this.txStorage.list(this.getAddress(account));
                        return [2 /*return*/, txs.slice(offset, offset + limit)];
                }
            });
        });
    };
    EthereumCoin.prototype.subscribe = function (account) {
        return __awaiter(this, void 0, void 0, function () {
            var web3, sub, address, obs;
            var _this = this;
            return __generator(this, function (_a) {
                web3 = this.web3;
                sub = this.web3ws.eth.subscribe('pendingTransactions');
                address = this.getAddress(account);
                obs = new Observable(function (subscriber) {
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
                                                    tx = convertTransaction(nativeTx, timestamp);
                                                    // Relevant transaction found, update tx cache and notify listeners
                                                    this.txStorage.add(this.getAddress(account), tx);
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
                            from: this.getAddress(0),
                            to: this.getAddress(0),
                            value: this.toBaseUnit('1'),
                        })];
                    case 1:
                        gas = _a.sent();
                        return [4 /*yield*/, this.web3.eth.getGasPrice()];
                    case 2:
                        gasPrice = _a.sent();
                        fee = new BN(gas).mul(new BN(gasPrice));
                        return [2 /*return*/, {
                                gas: gas.toString(),
                                gasPrice: gasPrice,
                                fee: this.fromBaseUnit(fee.toString()),
                            }];
                }
            });
        });
    };
    EthereumCoin.prototype.getCoinType = function () {
        return CoinType.ethereum;
    };
    EthereumCoin.prototype.transferPrivate = function (account, outputs) {
        return __awaiter(this, void 0, void 0, function () {
            var address, newPrivateAddress, totalOut, curBalance, _a, txData, tx, privateBalance, depositTx;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, this.fetchNotes()];
                    case 1:
                        _b.sent();
                        address = this.getAddress(0);
                        newPrivateAddress = this.privateAccount.generateAddress();
                        totalOut = outputs.reduce(function (acc, cur) {
                            var amount = BigInt(cur.amount);
                            return acc + amount;
                        }, BigInt(0));
                        _a = BigInt;
                        return [4 /*yield*/, this.getBalance(account)];
                    case 2:
                        curBalance = _a.apply(void 0, [_b.sent()]);
                        if (totalOut > curBalance) {
                            throw new Error('Cannot transfer more than you have');
                        }
                        return [4 /*yield*/, this.privateAccount.createTx(outputs)];
                    case 3:
                        txData = _b.sent();
                        tx = EthPrivateTransaction.fromData(this.privateAccount, TxType.Transfer, txData, this.params, this.web3).encode();
                        privateBalance = BigInt(this.getPrivateBalance());
                        if (!(privateBalance < totalOut)) return [3 /*break*/, 5];
                        depositTx = EthPrivateTransaction.fromData(this.privateAccount, TxType.Transfer, txData, this.params, this.web3).encode();
                        return [4 /*yield*/, this.web3.eth.call({
                                from: address,
                                to: this.config.contractAddress,
                                data: depositTx,
                                value: (totalOut - privateBalance).toString(),
                            })];
                    case 4:
                        _b.sent();
                        _b.label = 5;
                    case 5: return [4 /*yield*/, this.web3.eth.call({
                            from: address,
                            to: this.config.contractAddress,
                            data: '',
                        })];
                    case 6:
                        _b.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    EthereumCoin.prototype.getPrivateBalance = function () {
        return this.privateAccount.totalBalance();
    };
    /**
     * Attempt to extract and save usable account/notes from transaction data.
     * @param raw hex-encoded transaction data
     */
    EthereumCoin.prototype.cachePrivateTx = function (raw) {
        var txData = EthPrivateTransaction.decode(raw);
        var ciphertext = hexToBuf(txData.ciphertext);
        var pair = this.privateAccount.decryptPair(ciphertext);
        if (pair) {
            this.privateAccount.addAccount(txData.transferIndex, pair.account);
            // TODO: Add notes, if needed
        }
        else {
            var notes = this.privateAccount.decryptNotes(ciphertext);
            if (notes.length > 0) {
                for (var i = 0; i < notes.length; ++i) {
                    var note = notes[i];
                    this.privateAccount.addReceivedNote(txData.transferIndex + BigInt(1) + BigInt(i), note);
                }
            }
        }
    };
    EthereumCoin.prototype.fetchNotes = function () {
        return __awaiter(this, void 0, void 0, function () {
            var logs, _i, logs_1, log, tx, message;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.web3.eth.getPastLogs({ fromBlock: this.config.contractBlock, address: this.config.contractAddress })];
                    case 1:
                        logs = _a.sent();
                        _i = 0, logs_1 = logs;
                        _a.label = 2;
                    case 2:
                        if (!(_i < logs_1.length)) return [3 /*break*/, 5];
                        log = logs_1[_i];
                        return [4 /*yield*/, this.web3.eth.getTransaction(log.transactionHash)];
                    case 3:
                        tx = _a.sent();
                        message = tx.input;
                        try {
                            this.cachePrivateTx(message);
                        }
                        catch (e) {
                            return [3 /*break*/, 4];
                        }
                        _a.label = 4;
                    case 4:
                        _i++;
                        return [3 /*break*/, 2];
                    case 5: return [2 /*return*/];
                }
            });
        });
    };
    // TODO: These functions scan all blocks for regular transactions.
    //       Should probably remove them.
    /**
     * Scans blocks for account transactions (both from and to).
     * @param startBlockNumber
     * @param endBlockNumber
     * @param batchSize maximum number of parallel scans
     */
    EthereumCoin.prototype.fetchAccountTransactions = function (account, startBlockNumber, endBlockNumber, batchSize) {
        if (batchSize === void 0) { batchSize = MAX_SCAN_TASKS; }
        return __awaiter(this, void 0, void 0, function () {
            var address, transactions, batch, promises, currentBlock, results, _i, results_1, txs;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (endBlockNumber > startBlockNumber) {
                            throw new Error('startBlockNumber must be higher than endBlockNumber');
                        }
                        address = this.getAddress(account);
                        transactions = [];
                        batch = 0;
                        _a.label = 1;
                    case 1:
                        if (!(batch < startBlockNumber - endBlockNumber)) return [3 /*break*/, 4];
                        promises = [];
                        for (currentBlock = startBlockNumber - batch * batchSize; currentBlock >= endBlockNumber - batch * batchSize; --currentBlock) {
                            promises.push(this.scanBlock(address, currentBlock));
                        }
                        return [4 /*yield*/, Promise.all(promises)];
                    case 2:
                        results = _a.sent();
                        for (_i = 0, results_1 = results; _i < results_1.length; _i++) {
                            txs = results_1[_i];
                            transactions.push.apply(transactions, txs);
                        }
                        _a.label = 3;
                    case 3:
                        batch += batchSize;
                        return [3 /*break*/, 1];
                    case 4: return [2 /*return*/, transactions];
                }
            });
        });
    };
    /**
     * Scan block for account transactions.
     * @param address
     * @param blockNumber
     */
    EthereumCoin.prototype.scanBlock = function (address, blockNumber) {
        return __awaiter(this, void 0, void 0, function () {
            var transactions, block, _i, _a, tx, timestamp, newTx;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        transactions = [];
                        return [4 /*yield*/, this.web3.eth.getBlock(blockNumber, true)];
                    case 1:
                        block = _b.sent();
                        if (block != null && block.transactions != null) {
                            for (_i = 0, _a = block.transactions; _i < _a.length; _i++) {
                                tx = _a[_i];
                                if (address == tx.from || address == tx.to) {
                                    timestamp = (typeof block.timestamp == 'string') ? parseInt(block.timestamp) : block.timestamp;
                                    newTx = convertTransaction(tx, timestamp);
                                    transactions.push(newTx);
                                }
                            }
                        }
                        return [2 /*return*/, transactions];
                }
            });
        });
    };
    return EthereumCoin;
}(Coin));
export { EthereumCoin };
//# sourceMappingURL=coin.js.map