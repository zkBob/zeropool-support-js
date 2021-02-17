"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
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
var bip39_light_1 = __importDefault(require("bip39-light"));
var bn_js_1 = __importDefault(require("bn.js"));
var ed25519_hd_key_1 = require("ed25519-hd-key");
var tweetnacl_1 = require("tweetnacl");
;
var rxjs_1 = require("rxjs");
var format_1 = require("near-api-js/lib/utils/format");
var near_api_js_1 = require("near-api-js");
var key_pair_1 = require("near-api-js/lib/utils/key_pair");
var key_stores_1 = require("near-api-js/lib/key_stores");
var providers_1 = require("near-api-js/lib/providers");
var coin_type_1 = require("../coin-type");
var utils_1 = require("../../utils");
var transaction_1 = require("../transaction");
var POLL_INTERVAL = 10 * 60 * 1000;
var TX_LIMIT = 10;
var NearCoin = /** @class */ (function () {
    function NearCoin(mnemonic, config, account) {
        this.lastTxTimestamp = 0;
        this.keyStore = new key_stores_1.InMemoryKeyStore();
        this.config = config;
        var processed = utils_1.preprocessMnemonic(mnemonic);
        var path = coin_type_1.CoinType.derivationPath(coin_type_1.CoinType.near, account);
        var seed = bip39_light_1.default.mnemonicToSeed(processed);
        var key = ed25519_hd_key_1.derivePath(path, seed.toString('hex')).key;
        var naclKeypair = tweetnacl_1.sign.keyPair.fromSeed(key);
        var privateKey = bs58_1.default.encode(Buffer.from(naclKeypair.secretKey));
        this.keypair = key_pair_1.KeyPairEd25519.fromString(privateKey);
    }
    NearCoin.prototype.getPrivateKey = function () {
        return 'ed25519:' + bs58_1.default.encode(this.keypair.secretKey);
    };
    NearCoin.prototype.getPublicKey = function () {
        return 'ed25519:' + bs58_1.default.encode(this.keypair.getPublicKey().data);
    };
    NearCoin.prototype.getAddress = function () {
        return Buffer.from(this.keypair.getPublicKey().data).toString('hex');
    };
    NearCoin.prototype.getBalance = function () {
        return __awaiter(this, void 0, void 0, function () {
            var balance;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.ensureAccount()];
                    case 1:
                        _a.sent();
                        return [4 /*yield*/, this.account.getAccountBalance()];
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
    NearCoin.prototype.transfer = function (to, amount) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.ensureAccount()];
                    case 1:
                        _a.sent();
                        return [4 /*yield*/, this.account.sendMoney(to, new bn_js_1.default(amount))];
                    case 2:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    NearCoin.prototype.getTransactions = function (limit, offset) {
        return __awaiter(this, void 0, void 0, function () {
            var url, res, json, txs, _i, json_1, action, timestamp;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.ensureAccount()];
                    case 1:
                        _a.sent();
                        url = new URL("/account/" + this.getAddress() + "/activity", this.config.explorerUrl);
                        if (limit) {
                            url.searchParams.append('limit', limit.toString());
                        }
                        if (offset) {
                            url.searchParams.append('offset', offset.toString());
                        }
                        return [4 /*yield*/, fetch(url.toString())];
                    case 2:
                        res = _a.sent();
                        return [4 /*yield*/, res.json()];
                    case 3:
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
    NearCoin.prototype.subscribe = function () {
        return __awaiter(this, void 0, void 0, function () {
            var latestTxs;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.ensureAccount()];
                    case 1:
                        _a.sent();
                        return [4 /*yield*/, this.getTransactions(1)];
                    case 2:
                        latestTxs = _a.sent();
                        if (latestTxs.length == 1) {
                            this.lastTxTimestamp = latestTxs[0].timestamp;
                        }
                        return [2 /*return*/, new rxjs_1.Observable(function (subscriber) {
                                var interval = setInterval(function () { return __awaiter(_this, void 0, void 0, function () {
                                    var txs, _i, txs_1, tx, e_1;
                                    return __generator(this, function (_a) {
                                        switch (_a.label) {
                                            case 0:
                                                _a.trys.push([0, 2, , 3]);
                                                return [4 /*yield*/, this.fetchNewTransactions(TX_LIMIT, 0)];
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
    NearCoin.prototype.fetchNewTransactions = function (limit, offset) {
        return __awaiter(this, void 0, void 0, function () {
            var txs, txIdx, otherTxs;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.getTransactions(limit, offset)];
                    case 1:
                        txs = _a.sent();
                        txIdx = txs.findIndex(function (tx) { return tx.timestamp === _this.lastTxTimestamp; });
                        if (!(txIdx == -1)) return [3 /*break*/, 3];
                        return [4 /*yield*/, this.fetchNewTransactions(limit, offset + limit)];
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
            var status, latestBlock, res, gasPrice, gas, fee, feeFormatted;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.account.connection.provider.status()];
                    case 1:
                        status = _a.sent();
                        latestBlock = status.sync_info.latest_block_hash;
                        return [4 /*yield*/, this.rpc.sendJsonRpc('gas_price', [latestBlock])];
                    case 2:
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
    NearCoin.prototype.init = function () {
        return __awaiter(this, void 0, void 0, function () {
            var options, near, _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, this.keyStore.setKey(this.config.networkId, this.getAddress(), this.keypair)];
                    case 1:
                        _b.sent();
                        options = __assign(__assign({}, this.config), { deps: { keyStore: this.keyStore } });
                        return [4 /*yield*/, near_api_js_1.connect(options)];
                    case 2:
                        near = _b.sent();
                        _a = this;
                        return [4 /*yield*/, near.account(this.getAddress())];
                    case 3:
                        _a.account = _b.sent();
                        this.rpc = new providers_1.JsonRpcProvider(this.config.nodeUrl);
                        return [2 /*return*/];
                }
            });
        });
    };
    NearCoin.prototype.ensureAccount = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!!this.account) return [3 /*break*/, 2];
                        return [4 /*yield*/, this.init()];
                    case 1:
                        _a.sent();
                        _a.label = 2;
                    case 2: return [2 /*return*/];
                }
            });
        });
    };
    return NearCoin;
}());
exports.NearCoin = NearCoin;
//# sourceMappingURL=coin.js.map