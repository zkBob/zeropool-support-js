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
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.HDWallet = void 0;
var coin_type_1 = require("./coins/coin-type");
var near_1 = require("./coins/near");
var ethereum_1 = require("./coins/ethereum");
var ONE_FOR_ALL_COINS = (_a = {},
    _a[coin_type_1.CoinType.ethereum] = [0],
    _a[coin_type_1.CoinType.near] = [0],
    _a);
var HDWallet = /** @class */ (function () {
    function HDWallet(seed, config, coins) {
        if (coins === void 0) { coins = ONE_FOR_ALL_COINS; }
        this.coins = {};
        this.seed = seed;
        this.config = config;
        for (var _i = 0, _a = Object.entries(coins); _i < _a.length; _i++) {
            var _b = _a[_i], key = _b[0], accounts = _b[1];
            var coin = Number(key);
            this.enableCoin(coin, accounts);
        }
    }
    HDWallet.prototype.getRegularAddress = function (coinType, account) {
        var _a;
        return (_a = this.getCoin(coinType, account)) === null || _a === void 0 ? void 0 : _a.getAddress();
    };
    HDWallet.prototype.getRegularPrivateKey = function (coinType, account) {
        var _a;
        return (_a = this.getCoin(coinType, account)) === null || _a === void 0 ? void 0 : _a.getPrivateKey();
    };
    HDWallet.prototype.getBalances = function () {
        return __awaiter(this, void 0, void 0, function () {
            var promises, pairs;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        promises = Object.keys(this.coins).map(function (coinType) {
                            var coin = _this.getCoin(coin_type_1.CoinType[coinType], 0);
                            return coin.getBalance().then(function (balance) { return [coinType, balance]; });
                        });
                        return [4 /*yield*/, Promise.all(promises)];
                    case 1:
                        pairs = _a.sent();
                        return [2 /*return*/, pairs.reduce(function (balances, _a) {
                                var coinType = _a[0], balance = _a[1];
                                balances[coinType] = balance;
                                return balances;
                            }, {})];
                }
            });
        });
    };
    HDWallet.prototype.enableCoin = function (coin, accounts) {
        var instances = [];
        switch (coin) {
            case coin_type_1.CoinType.near: {
                for (var _i = 0, accounts_1 = accounts; _i < accounts_1.length; _i++) {
                    var account = accounts_1[_i];
                    instances[account] = new near_1.NearCoin(this.seed, this.config.near, account);
                }
                break;
            }
            case coin_type_1.CoinType.ethereum: {
                for (var _a = 0, accounts_2 = accounts; _a < accounts_2.length; _a++) {
                    var account = accounts_2[_a];
                    instances[account] = new ethereum_1.EthereumCoin(this.seed, this.config.ethereum, account);
                }
                break;
            }
            default: {
                throw new Error("CoinType " + coin + " is not implemented");
            }
        }
        this.coins[coin] = instances;
    };
    HDWallet.prototype.disableCoin = function (coin) {
        delete this.coins[coin];
    };
    HDWallet.prototype.getCoin = function (coinType, account) {
        var coin = this.coins[coinType];
        if (!coin) {
            throw new Error("Coin " + coinType + " is not initialized");
        }
        return coin[account];
    };
    return HDWallet;
}());
exports.HDWallet = HDWallet;
//# sourceMappingURL=hd-wallet.js.map