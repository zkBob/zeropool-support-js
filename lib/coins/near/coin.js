"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NearCoin = void 0;
var bs58_1 = __importDefault(require("bs58"));
var bn_js_1 = __importDefault(require("bn.js"));
var rxjs_1 = require("rxjs");
var format_1 = require("near-api-js/lib/utils/format");
var key_stores_1 = require("near-api-js/lib/key_stores");
var providers_1 = require("near-api-js/lib/providers");
var coin_1 = require("../coin");
var transaction_1 = require("../transaction");
var account_1 = require("./account");
var coin_type_1 = require("../coin-type");
var POLL_INTERVAL = 10 * 60 * 1000;
var TX_LIMIT = 10;
var NearCoin = /** @class */ (function (_super) {
    __extends(NearCoin, _super);
    function NearCoin(mnemonic, config) {
        var _this = _super.call(this, mnemonic) || this;
        _this.lastTxTimestamps = []; // FIXME: There can be multiple accounts. This is incorrect.
        _this.mnemonic = mnemonic;
        _this.keyStore = new key_stores_1.InMemoryKeyStore();
        _this.config = config;
        _this.accounts = new account_1.AccountCache();
        _this.rpc = new providers_1.JsonRpcProvider(_this.config.nodeUrl);
        return _this;
    }
    NearCoin.prototype.getPrivateKey = function (account) {
        var keypair = this.accounts.getOrCreate(this.mnemonic, account).keypair;
        return 'ed25519:' + bs58_1.default.encode(keypair.secretKey);
    };
    NearCoin.prototype.getPublicKey = function (account) {
        var keypair = this.accounts.getOrCreate(this.mnemonic, account).keypair;
        return 'ed25519:' + bs58_1.default.encode(keypair.getPublicKey().data);
    };
    NearCoin.prototype.getAddress = function (account) {
        var keypair = this.accounts.getOrCreate(this.mnemonic, account).keypair;
        return Buffer.from(keypair.getPublicKey().data).toString('hex');
    };
    NearCoin.prototype.getBalance = function (accountIndex) {
        return __awaiter(this, void 0, void 0, function () {
            var account, balance;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.accounts.getOrInit(this.mnemonic, accountIndex, this.config, this.keyStore)];
                    case 1:
                        account = _a.sent();
                        return [4 /*yield*/, account.account.getAccountBalance()];
                    case 2:
                        balance = _a.sent();
                        return [2 /*return*/, balance.available];
                }
            });
        });
    };
    /**
     * @param to
     * @param amount in yoctoNEAR
     */
    NearCoin.prototype.transfer = function (accountIndex, to, amount) {
        return __awaiter(this, void 0, void 0, function () {
            var account;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.accounts.getOrInit(this.mnemonic, accountIndex, this.config, this.keyStore)];
                    case 1:
                        account = _a.sent();
                        return [4 /*yield*/, account.account.sendMoney(to, new bn_js_1.default(amount))];
                    case 2:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    NearCoin.prototype.getTransactions = function (accountIndex, limit, offset) {
        return __awaiter(this, void 0, void 0, function () {
            var url, res, json, txs, _i, json_1, action, timestamp;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        url = new URL("/account/" + this.getAddress(accountIndex) + "/activity", this.config.explorerUrl);
                        if (limit) {
                            url.searchParams.append('limit', limit.toString());
                        }
                        if (offset) {
                            url.searchParams.append('offset', offset.toString());
                        }
                        return [4 /*yield*/, fetch(url.toString())];
                    case 1:
                        res = _a.sent();
                        return [4 /*yield*/, res.json()];
                    case 2:
                        json = _a.sent();
                        txs = [];
                        for (_i = 0, json_1 = json; _i < json_1.length; _i++) {
                            action = json_1[_i];
                            timestamp = parseInt(action.block_timestamp) / 1000000;
                            if (action['action_kind'] == 'TRANSFER') {
                                txs.push({
                                    status: transaction_1.TxStatus.Completed,
                                    amount: action.args.deposit,
                                    from: action.signer_id,
                                    to: action.receiver_id,
                                    timestamp: timestamp,
                                    blockHash: action.block_hash,
                                    hash: action.hash,
                                });
                            }
                        }
                        return [2 /*return*/, txs];
                }
            });
        });
    };
    NearCoin.prototype.subscribe = function (account) {
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
                        return [2 /*return*/, new rxjs_1.Observable(function (subscriber) {
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
    NearCoin.prototype.fetchNewTransactions = function (account, limit, offset) {
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
    /**
     * Convert human-readable NEAR to yoctoNEAR
     **/
    NearCoin.prototype.toBaseUnit = function (amount) {
        return format_1.parseNearAmount(amount);
    };
    /**
    * Convert yoctoNEAR to human-readable NEAR
    **/
    NearCoin.prototype.fromBaseUnit = function (amount) {
        return format_1.formatNearAmount(amount);
    };
    NearCoin.prototype.estimateTxFee = function () {
        return __awaiter(this, void 0, void 0, function () {
            var account, status, latestBlock, res, gasPrice, gas, fee, feeFormatted;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.accounts.getOrInit(this.mnemonic, 0, this.config, this.keyStore)];
                    case 1:
                        account = _a.sent();
                        return [4 /*yield*/, account.account.connection.provider.status()];
                    case 2:
                        status = _a.sent();
                        latestBlock = status.sync_info.latest_block_hash;
                        return [4 /*yield*/, this.rpc.sendJsonRpc('gas_price', [latestBlock])];
                    case 3:
                        res = (_a.sent()).gas_price;
                        gasPrice = new bn_js_1.default(res);
                        gas = new bn_js_1.default('30000000000000');
                        fee = gas.mul(gasPrice).toString();
                        feeFormatted = format_1.formatNearAmount(fee);
                        return [2 /*return*/, {
                                gas: gas.toString(),
                                gasPrice: gasPrice.toString(),
                                fee: feeFormatted,
                            }];
                }
            });
        });
    };
    NearCoin.prototype.getCoinType = function () {
        return coin_type_1.CoinType.near;
    };
    return NearCoin;
}(coin_1.Coin));
exports.NearCoin = NearCoin;
//# sourceMappingURL=coin.js.map