import { UserAccount, reduceSpendingKey, UserState } from '../libzeropool-rs';
;
import { hash } from 'tweetnacl';
import { CoinType } from './coin-type';
import { bufToHex, deriveEd25519 } from "../utils";
export class Balance {
}
export class Coin {
    constructor(mnemonic) {
        this.mnemonic = mnemonic;
        this.initPromise = this.init();
    }
    async init() {
        const sk = this.getPrivateSpendingKey();
        const coinName = this.getCoinType();
        const userId = bufToHex(hash(sk));
        const state = await UserState.init(`zp.${coinName}.${userId}`);
        try {
            const acc = new UserAccount(sk, state);
            this.privateAccount = acc;
        }
        catch (e) {
            console.error(e);
        }
    }
    async ready() {
        await this.initPromise;
    }
    generatePrivateAddress() {
        return this.privateAccount.generateAddress();
    }
    isOwnPrivateAddress(address) {
        return this.privateAccount.isOwnAddress(address);
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
    async getBalances(numAccounts, offset = 0) {
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
    /**
   * Get total, account, and note balances.
   */
    getPrivateBalances() {
        throw new Error('unimplemented');
    }
    updatePrivateState() {
        throw new Error('unimplemented');
    }
    async getNotes() {
        throw new Error('unimplemented');
    }
}
//# sourceMappingURL=coin.js.map