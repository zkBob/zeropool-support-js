"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AccountCache = exports.CachedAccount = void 0;
const bs58_1 = __importDefault(require("bs58"));
const ed25519_hd_key_1 = require("ed25519-hd-key");
const tweetnacl_1 = require("tweetnacl");
const ts_lib_crypto_1 = require("@waves/ts-lib-crypto");
const bip39_light_1 = __importDefault(require("bip39-light"));
const config_1 = require("./config");
const coin_type_1 = require("../coin-type");
const utils_1 = require("../../utils");
class CachedAccount {
    constructor(keypair, chainId) {
        this.keypair = keypair;
        const buffer = new Uint8Array(26);
        buffer[0] = 1; // Entity type (always = 1)
        buffer[1] = config_1.ChainId.chainIdNumber(chainId);
        const pubHash = (0, ts_lib_crypto_1.keccak)((0, ts_lib_crypto_1.blake2b)(keypair.publicKey)).slice(0, 20);
        buffer.set(pubHash, 2);
        const hash = (0, ts_lib_crypto_1.keccak)((0, ts_lib_crypto_1.blake2b)(buffer.slice(0, 22))).slice(0, 4);
        buffer.set(hash, 22);
        this.address = bs58_1.default.encode(buffer);
    }
    get privateKey() {
        return bs58_1.default.encode(Buffer.from(this.keypair.secretKey.slice(0, 32)));
    }
    get publicKey() {
        return bs58_1.default.encode(Buffer.from(this.keypair.publicKey));
    }
}
exports.CachedAccount = CachedAccount;
class AccountCache {
    constructor(mnemonic, chainId) {
        this.accounts = [];
        this.seed = bip39_light_1.default.mnemonicToSeed((0, utils_1.preprocessMnemonic)(mnemonic));
        this.chainId = chainId;
    }
    get(account) {
        return this.accounts[account];
    }
    getOrCreate(account) {
        let cachedAccount = this.accounts[account];
        if (cachedAccount) {
            return cachedAccount;
        }
        const path = coin_type_1.CoinType.derivationPath(coin_type_1.CoinType.waves, account);
        const { key } = (0, ed25519_hd_key_1.derivePath)(path, this.seed.toString('hex'));
        const keypair = tweetnacl_1.sign.keyPair.fromSeed(key);
        cachedAccount = new CachedAccount(keypair, this.chainId);
        this.accounts[account] = cachedAccount;
        return cachedAccount;
    }
}
exports.AccountCache = AccountCache;
//# sourceMappingURL=account.js.map