import bs58 from 'bs58';
import { derivePath } from 'ed25519-hd-key';
import { sign } from 'tweetnacl';
import { blake2b, keccak } from '@waves/ts-lib-crypto';
import bip39 from 'bip39-light';
import { ChainId } from './config';
import { CoinType } from "../coin-type";
import { preprocessMnemonic } from "../../utils";
export class CachedAccount {
    constructor(keypair, chainId) {
        this.keypair = keypair;
        const buffer = new Uint8Array(26);
        buffer[0] = 1; // Entity type (always = 1)
        buffer[1] = ChainId.chainIdNumber(chainId);
        const pubHash = keccak(blake2b(keypair.publicKey)).slice(0, 20);
        buffer.set(pubHash, 2);
        const hash = keccak(blake2b(buffer.slice(0, 22))).slice(0, 4);
        buffer.set(hash, 22);
        this.address = bs58.encode(buffer);
    }
    get privateKey() {
        return bs58.encode(Buffer.from(this.keypair.secretKey.slice(0, 32)));
    }
    get publicKey() {
        return bs58.encode(Buffer.from(this.keypair.publicKey));
    }
}
export class AccountCache {
    constructor(mnemonic, chainId) {
        this.accounts = [];
        this.seed = bip39.mnemonicToSeed(preprocessMnemonic(mnemonic));
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
        const path = CoinType.derivationPath(CoinType.waves, account);
        const { key } = derivePath(path, this.seed.toString('hex'));
        const keypair = sign.keyPair.fromSeed(key);
        cachedAccount = new CachedAccount(keypair, this.chainId);
        this.accounts[account] = cachedAccount;
        return cachedAccount;
    }
}
//# sourceMappingURL=account.js.map