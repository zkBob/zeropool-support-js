"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AccountCache = exports.CachedAccount = void 0;
const bs58_1 = __importDefault(require("bs58"));
const ed25519_hd_key_1 = require("ed25519-hd-key");
const tweetnacl_1 = require("tweetnacl");
const near_api_js_1 = require("near-api-js");
const key_pair_1 = require("near-api-js/lib/utils/key_pair");
const utils_1 = require("../../utils");
const coin_type_1 = require("../coin-type");
const bip39_light_1 = __importDefault(require("bip39-light"));
class CachedAccount {
    constructor(keypair) {
        this.keypair = keypair;
    }
    async init(config, keyStore) {
        await keyStore.setKey(config.networkId, this.getAddress(), this.keypair);
        const options = Object.assign(Object.assign({}, config), { deps: { keyStore: keyStore } });
        const near = await (0, near_api_js_1.connect)(options);
        this.account = await near.account(this.getAddress());
    }
    getAddress() {
        return Buffer.from(this.keypair.getPublicKey().data).toString('hex');
    }
    isInitialized() {
        return !!this.account;
    }
}
exports.CachedAccount = CachedAccount;
class AccountCache {
    constructor() {
        this.accounts = [];
    }
    get(account) {
        return this.accounts[account];
    }
    getOrCreate(mnemonic, account) {
        let nearAccount = this.accounts[account];
        if (nearAccount) {
            return nearAccount;
        }
        const processed = (0, utils_1.preprocessMnemonic)(mnemonic);
        const path = coin_type_1.CoinType.derivationPath(coin_type_1.CoinType.near, account);
        const seed = bip39_light_1.default.mnemonicToSeed(processed);
        const { key } = (0, ed25519_hd_key_1.derivePath)(path, seed.toString('hex'));
        const naclKeypair = tweetnacl_1.sign.keyPair.fromSeed(key);
        const privateKey = bs58_1.default.encode(Buffer.from(naclKeypair.secretKey));
        const keypair = key_pair_1.KeyPairEd25519.fromString(privateKey);
        nearAccount = new CachedAccount(keypair);
        this.accounts[account] = nearAccount;
        return nearAccount;
    }
    async getOrInit(mnemonic, account, config, keyStore) {
        const nearAccount = this.getOrCreate(mnemonic, account);
        if (!nearAccount.isInitialized()) {
            await nearAccount.init(config, keyStore);
        }
        return this.accounts[account];
    }
}
exports.AccountCache = AccountCache;
//# sourceMappingURL=account.js.map