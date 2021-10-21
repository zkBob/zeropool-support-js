var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import bs58 from 'bs58';
import { derivePath } from 'ed25519-hd-key';
import { sign } from 'tweetnacl';
import { connect } from 'near-api-js';
import { KeyPairEd25519 } from 'near-api-js/lib/utils/key_pair';
import { CoinType } from '../coin-type';
import { preprocessMnemonic } from '../../utils';
import bip39 from 'bip39-light';
export class CachedAccount {
    constructor(keypair) {
        this.keypair = keypair;
    }
    init(config, keyStore) {
        return __awaiter(this, void 0, void 0, function* () {
            yield keyStore.setKey(config.networkId, this.getAddress(), this.keypair);
            const options = Object.assign(Object.assign({}, config), { deps: { keyStore: keyStore } });
            const near = yield connect(options);
            this.account = yield near.account(this.getAddress());
        });
    }
    getAddress() {
        return Buffer.from(this.keypair.getPublicKey().data).toString('hex');
    }
    isInitialized() {
        return !!this.account;
    }
}
export class AccountCache {
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
        const processed = preprocessMnemonic(mnemonic);
        const path = CoinType.derivationPath(CoinType.near, account);
        const seed = bip39.mnemonicToSeed(processed);
        const { key } = derivePath(path, seed.toString('hex'));
        const naclKeypair = sign.keyPair.fromSeed(key);
        const privateKey = bs58.encode(Buffer.from(naclKeypair.secretKey));
        const keypair = KeyPairEd25519.fromString(privateKey);
        nearAccount = new CachedAccount(keypair);
        this.accounts[account] = nearAccount;
        return nearAccount;
    }
    getOrInit(mnemonic, account, config, keyStore) {
        return __awaiter(this, void 0, void 0, function* () {
            const nearAccount = this.getOrCreate(mnemonic, account);
            if (!nearAccount.isInitialized()) {
                yield nearAccount.init(config, keyStore);
            }
            return this.accounts[account];
        });
    }
}
//# sourceMappingURL=account.js.map