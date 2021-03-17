"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AccountCache = exports.CachedAccount = void 0;
var bip39_light_1 = __importDefault(require("bip39-light"));
var utils_1 = require("../../utils");
var coin_type_1 = require("../coin-type");
var CachedAccount = /** @class */ (function () {
    function CachedAccount(keypair, web3) {
        this.keypair = keypair;
        var privateKey = '0x' + this.keypair.privateKey.toString('hex');
        this.account = web3.eth.accounts.privateKeyToAccount(privateKey);
    }
    return CachedAccount;
}());
exports.CachedAccount = CachedAccount;
var AccountCache = /** @class */ (function () {
    function AccountCache(mnemonic, web3) {
        this.accounts = [];
        var processed = utils_1.preprocessMnemonic(mnemonic);
        // validate mnemonic
        bip39_light_1.default.mnemonicToEntropy(processed);
        var path = coin_type_1.CoinType.chainPath(coin_type_1.CoinType.ethereum);
        var seed = bip39_light_1.default.mnemonicToSeed(processed);
        var hdkey = utils_1.Secp256k1HDKey.fromMasterSeed(seed);
        this.root = hdkey.derive(path);
        this.web3 = web3;
    }
    AccountCache.prototype.getOrCreate = function (accountNumber) {
        var account = this.accounts[accountNumber];
        if (account) {
            return account;
        }
        var keypair = this.root.derive('m' + coin_type_1.CoinType.accountPath(coin_type_1.CoinType.ethereum, accountNumber));
        account = new CachedAccount(keypair, this.web3);
        this.accounts[accountNumber] = account;
        return account;
    };
    return AccountCache;
}());
exports.AccountCache = AccountCache;
//# sourceMappingURL=account.js.map