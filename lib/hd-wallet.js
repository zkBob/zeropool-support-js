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
import { CoinType } from './coins/coin-type';
import { NearCoin } from './coins/near';
import { EthereumCoin } from './coins/ethereum';
import { WavesCoin } from './coins/waves';
var HDWallet = /** @class */ (function () {
    function HDWallet(seed, config) {
        this.coins = {};
        this.seed = seed;
        this.config = config;
    }
    HDWallet.prototype.init = function (coinTypes) {
        return __awaiter(this, void 0, void 0, function () {
            var promises;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        promises = coinTypes.map(function (coin) { return _this.enableCoin(coin); });
                        return [4 /*yield*/, Promise.all(promises)];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    HDWallet.prototype.getRegularAddress = function (coinType, account) {
        var _a;
        return (_a = this.getCoin(coinType)) === null || _a === void 0 ? void 0 : _a.getAddress(account);
    };
    HDWallet.prototype.getRegularPrivateKey = function (coinType, account) {
        var _a;
        return (_a = this.getCoin(coinType)) === null || _a === void 0 ? void 0 : _a.getPrivateKey(account);
    };
    HDWallet.prototype.getBalances = function (numAccounts, offset) {
        if (offset === void 0) { offset = 0; }
        return __awaiter(this, void 0, void 0, function () {
            var promises, pairs;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        promises = Object.entries(this.coins).map(function (_a) {
                            var coinType = _a[0], coin = _a[1];
                            return coin.getBalances(numAccounts, offset)
                                .then(function (balances) { return [coinType, balances]; });
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
    HDWallet.prototype.enableCoin = function (coinType) {
        return __awaiter(this, void 0, void 0, function () {
            var coin;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        switch (coinType) {
                            case CoinType.near: {
                                coin = new NearCoin(this.seed, this.config.near);
                                break;
                            }
                            case CoinType.ethereum: {
                                coin = new EthereumCoin(this.seed, this.config.ethereum);
                                break;
                            }
                            case CoinType.waves: {
                                coin = new WavesCoin(this.seed, this.config.waves);
                                break;
                            }
                            default: {
                                throw new Error("CoinType " + coinType + " is not implemented");
                            }
                        }
                        return [4 /*yield*/, coin.init()];
                    case 1:
                        _a.sent();
                        this.coins[coinType] = coin;
                        return [2 /*return*/];
                }
            });
        });
    };
    HDWallet.prototype.disableCoin = function (coin) {
        delete this.coins[coin];
    };
    HDWallet.prototype.getCoin = function (coinType) {
        return this.coins[coinType];
    };
    return HDWallet;
}());
export { HDWallet };
//# sourceMappingURL=hd-wallet.js.map