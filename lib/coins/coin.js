var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { UserAccount, reduceSpendingKey, UserState } from 'libzeropool-rs-wasm-bundler';
import { hash } from 'tweetnacl';
import { CoinType } from './coin-type';
import { bufToHex, deriveEd25519 } from '../utils';
export class Balance {
}
export class Coin {
    constructor(mnemonic) {
        this.mnemonic = mnemonic;
        this.initPromise = this.init();
    }
    init() {
        return __awaiter(this, void 0, void 0, function* () {
            const sk = this.getPrivateSpendingKey();
            const coinName = this.getCoinType();
            const userId = bufToHex(hash(sk));
            const state = yield UserState.init(`zp.${coinName}.${userId}`);
            try {
                const acc = new UserAccount(sk, state);
                this.privateAccount = acc;
            }
            catch (e) {
                console.error(e);
            }
        });
    }
    ready() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.initPromise;
        });
    }
    generatePrivateAddress() {
        return this.privateAccount.generateAddress();
    }
    getPrivateSpendingKey() {
        const path = CoinType.privateDerivationPath(this.getCoinType());
        const pair = deriveEd25519(path, this.mnemonic); // FIXME: Derive on BabyJubJub
        return reduceSpendingKey(pair.secretKey.slice(0, 32));
    }
    /**
     * Get balances for specified number of accounts with offset.
     * @param numAccounts
     * @param offset
     */
    getBalances(numAccounts, offset = 0) {
        return __awaiter(this, void 0, void 0, function* () {
            const promises = [];
            for (let account = offset; account < offset + numAccounts; ++account) {
                const promise = this.getBalance(account)
                    .catch(_err => '0') // TODO: Log errors
                    .then((balance) => ({
                    address: this.getAddress(account),
                    balance,
                }));
                promises.push(promise);
            }
            return Promise.all(promises);
        });
    }
    // TODO: Extract private tx methods into a separate class
    transferPublicToPrivate(account, outputs) {
        throw new Error('unimplemented');
    }
    transferPrivateToPrivate(account, outputs) {
        throw new Error('unimplemented');
    }
    depositPrivate(account, amount) {
        throw new Error('unimplemented');
    }
    mergePrivate() {
        throw new Error('unimplemented');
    }
    withdrawPrivate(account, amount) {
        throw new Error('unimplemented');
    }
    /**
     * Get current total private balance (account + unspent notes).
     */
    getPrivateBalance() {
        throw new Error('unimplemented');
    }
    updatePrivateState() {
        throw new Error('unimplemented');
    }
    getNotes() {
        return __awaiter(this, void 0, void 0, function* () {
            throw new Error('unimplemented');
        });
    }
}
//# sourceMappingURL=coin.js.map