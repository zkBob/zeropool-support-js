"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Coin = exports.Balance = void 0;
const libzeropool_rs_1 = require("../libzeropool-rs");
;
const tweetnacl_1 = require("tweetnacl");
const coin_type_1 = require("./coin-type");
const utils_1 = require("../utils");
class Balance {
}
exports.Balance = Balance;
class Coin {
    constructor(mnemonic, worker) {
        this.mnemonic = mnemonic;
        this.initPromise = this.init();
        this.worker = worker;
    }
    async init() {
        const sk = this.getPrivateSpendingKey();
        const coinName = this.getCoinType();
        const userId = (0, utils_1.bufToHex)((0, tweetnacl_1.hash)(sk));
        const state = await libzeropool_rs_1.UserState.init(`zp.${coinName}.${userId}`);
        try {
            const acc = new libzeropool_rs_1.UserAccount(sk, state);
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
        const path = coin_type_1.CoinType.privateDerivationPath(this.getCoinType());
        const pair = (0, utils_1.deriveEd25519)(path, this.mnemonic); // FIXME: Derive on BabyJubJub
        return (0, libzeropool_rs_1.reduceSpendingKey)(pair.secretKey.slice(0, 32));
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
exports.Coin = Coin;
//# sourceMappingURL=coin.js.map