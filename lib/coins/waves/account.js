import bs58 from 'bs58';
import { derivePath } from 'ed25519-hd-key';
import { sign } from 'tweetnacl';
import { blake2b, keccak } from '@waves/ts-lib-crypto';
import { ChainId } from './config';
import { CoinType } from '../coin-type';
import { preprocessMnemonic } from '../../utils';
import bip39 from 'bip39-light';
var CachedAccount = /** @class */ (function () {
    function CachedAccount(keypair, chainId) {
        this.keypair = keypair;
        var buffer = new Uint8Array(26);
        buffer[0] = 1; // Entity type (always = 1)
        buffer[1] = ChainId.chainIdNumber(chainId);
        var pubHash = keccak(blake2b(keypair.publicKey)).slice(0, 20);
        buffer.set(pubHash, 2);
        var hash = keccak(blake2b(buffer.slice(0, 22))).slice(0, 4);
        buffer.set(hash, 22);
        this.address = bs58.encode(buffer);
    }
    Object.defineProperty(CachedAccount.prototype, "privateKey", {
        get: function () {
            return bs58.encode(Buffer.from(this.keypair.secretKey.slice(0, 32)));
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(CachedAccount.prototype, "publicKey", {
        get: function () {
            return bs58.encode(Buffer.from(this.keypair.publicKey));
        },
        enumerable: false,
        configurable: true
    });
    return CachedAccount;
}());
export { CachedAccount };
var AccountCache = /** @class */ (function () {
    function AccountCache(mnemonic, chainId) {
        this.accounts = [];
        this.seed = bip39.mnemonicToSeed(preprocessMnemonic(mnemonic));
        this.chainId = chainId;
    }
    AccountCache.prototype.get = function (account) {
        return this.accounts[account];
    };
    AccountCache.prototype.getOrCreate = function (account) {
        var cachedAccount = this.accounts[account];
        if (cachedAccount) {
            return cachedAccount;
        }
        var path = CoinType.derivationPath(CoinType.waves, account);
        var key = derivePath(path, this.seed.toString('hex')).key;
        var keypair = sign.keyPair.fromSeed(key);
        cachedAccount = new CachedAccount(keypair, this.chainId);
        this.accounts[account] = cachedAccount;
        return cachedAccount;
    };
    return AccountCache;
}());
export { AccountCache };
//# sourceMappingURL=account.js.map