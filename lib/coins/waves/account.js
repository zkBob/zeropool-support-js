"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AccountCache = exports.CachedAccount = void 0;
var bs58_1 = __importDefault(require("bs58"));
var ed25519_hd_key_1 = require("ed25519-hd-key");
var tweetnacl_1 = require("tweetnacl");
var coin_type_1 = require("../coin-type");
var utils_1 = require("../../utils");
var bip39_light_1 = __importDefault(require("bip39-light"));
var CachedAccount = /** @class */ (function () {
    function CachedAccount(keypair) {
        this.keypair = keypair;
    }
    Object.defineProperty(CachedAccount.prototype, "address", {
        get: function () {
            return this.publicKey;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(CachedAccount.prototype, "privateKey", {
        get: function () {
            return bs58_1.default.encode(Buffer.from(this.keypair.secretKey));
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(CachedAccount.prototype, "publicKey", {
        get: function () {
            return bs58_1.default.encode(Buffer.from(this.keypair.publicKey));
        },
        enumerable: false,
        configurable: true
    });
    return CachedAccount;
}());
exports.CachedAccount = CachedAccount;
var AccountCache = /** @class */ (function () {
    function AccountCache(mnemonic) {
        this.accounts = [];
        this.seed = bip39_light_1.default.mnemonicToSeed(utils_1.preprocessMnemonic(mnemonic));
    }
    AccountCache.prototype.get = function (account) {
        return this.accounts[account];
    };
    AccountCache.prototype.getOrCreate = function (account) {
        var cachedAccount = this.accounts[account];
        if (cachedAccount) {
            return cachedAccount;
        }
        var path = coin_type_1.CoinType.derivationPath(coin_type_1.CoinType.waves, account);
        var key = ed25519_hd_key_1.derivePath(path, this.seed.toString('hex')).key;
        var keypair = tweetnacl_1.sign.keyPair.fromSeed(key);
        cachedAccount = new CachedAccount(keypair);
        this.accounts[account] = cachedAccount;
        return cachedAccount;
    };
    return AccountCache;
}());
exports.AccountCache = AccountCache;
//# sourceMappingURL=account.js.map