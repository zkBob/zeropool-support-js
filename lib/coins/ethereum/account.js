"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AccountCache = exports.CachedAccount = void 0;
const bip39_light_1 = __importDefault(require("bip39-light"));
const utils_1 = require("../../utils");
const coin_type_1 = require("../coin-type");
class CachedAccount {
    constructor(keypair, web3) {
        this.keypair = keypair;
        const privateKey = '0x' + this.keypair.privateKey.toString('hex');
        this.account = web3.eth.accounts.privateKeyToAccount(privateKey);
    }
}
exports.CachedAccount = CachedAccount;
class AccountCache {
    constructor(mnemonic, web3) {
        this.accounts = [];
        const processed = (0, utils_1.preprocessMnemonic)(mnemonic);
        // validate mnemonic
        bip39_light_1.default.mnemonicToEntropy(processed);
        const path = coin_type_1.CoinType.chainPath(coin_type_1.CoinType.ethereum);
        const seed = bip39_light_1.default.mnemonicToSeed(processed);
        const hdkey = utils_1.Secp256k1HDKey.fromMasterSeed(seed);
        this.root = hdkey.derive(path);
        this.web3 = web3;
    }
    getOrCreate(accountNumber) {
        let account = this.accounts[accountNumber];
        if (account) {
            return account;
        }
        const keypair = this.root.derive('m' + coin_type_1.CoinType.accountPath(coin_type_1.CoinType.ethereum, accountNumber));
        account = new CachedAccount(keypair, this.web3);
        this.accounts[accountNumber] = account;
        return account;
    }
}
exports.AccountCache = AccountCache;
//# sourceMappingURL=account.js.map