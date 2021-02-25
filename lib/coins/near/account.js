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
exports.AccountCache = exports.CachedAccount = void 0;
var bs58_1 = __importDefault(require("bs58"));
var ed25519_hd_key_1 = require("ed25519-hd-key");
var tweetnacl_1 = require("tweetnacl");
var near_api_js_1 = require("near-api-js");
var key_pair_1 = require("near-api-js/lib/utils/key_pair");
var coin_type_1 = require("../coin-type");
var utils_1 = require("../../utils");
var bip39_light_1 = __importDefault(require("bip39-light"));
var CachedAccount = /** @class */ (function () {
    function CachedAccount(keypair) {
        this.keypair = keypair;
    }
    CachedAccount.prototype.init = function (config, keyStore) {
        return __awaiter(this, void 0, void 0, function () {
            var options, near, _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, keyStore.setKey(config.networkId, this.getAddress(), this.keypair)];
                    case 1:
                        _b.sent();
                        options = __assign(__assign({}, config), { deps: { keyStore: keyStore } });
                        return [4 /*yield*/, near_api_js_1.connect(options)];
                    case 2:
                        near = _b.sent();
                        _a = this;
                        return [4 /*yield*/, near.account(this.getAddress())];
                    case 3:
                        _a.account = _b.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    CachedAccount.prototype.getAddress = function () {
        return Buffer.from(this.keypair.getPublicKey().data).toString('hex');
    };
    CachedAccount.prototype.isInitialized = function () {
        return !!this.account;
    };
    return CachedAccount;
}());
exports.CachedAccount = CachedAccount;
var AccountCache = /** @class */ (function () {
    function AccountCache() {
        this.accounts = [];
    }
    AccountCache.prototype.get = function (account) {
        return this.accounts[account];
    };
    AccountCache.prototype.getOrCreate = function (mnemonic, account) {
        var nearAccount = this.accounts[account];
        if (nearAccount) {
            return nearAccount;
        }
        var processed = utils_1.preprocessMnemonic(mnemonic);
        var path = coin_type_1.CoinType.derivationPath(coin_type_1.CoinType.near, account);
        var seed = bip39_light_1.default.mnemonicToSeed(processed);
        var key = ed25519_hd_key_1.derivePath(path, seed.toString('hex')).key;
        var naclKeypair = tweetnacl_1.sign.keyPair.fromSeed(key);
        var privateKey = bs58_1.default.encode(Buffer.from(naclKeypair.secretKey));
        var keypair = key_pair_1.KeyPairEd25519.fromString(privateKey);
        nearAccount = new CachedAccount(keypair);
        this.accounts[account] = nearAccount;
        return nearAccount;
    };
    AccountCache.prototype.getOrInit = function (mnemonic, account, config, keyStore) {
        return __awaiter(this, void 0, void 0, function () {
            var nearAccount;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        nearAccount = this.getOrCreate(mnemonic, account);
                        if (!!nearAccount.isInitialized()) return [3 /*break*/, 2];
                        return [4 /*yield*/, nearAccount.init(config, keyStore)];
                    case 1:
                        _a.sent();
                        _a.label = 2;
                    case 2: return [2 /*return*/, this.accounts[account]];
                }
            });
        });
    };
    return AccountCache;
}());
exports.AccountCache = AccountCache;
//# sourceMappingURL=account.js.map