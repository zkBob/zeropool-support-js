import { Observable } from 'rxjs';
import { UserAccount, reduceSpendingKey, UserState, Output } from 'libzeropool-rs-wasm-bundler';

import { Transaction, TxFee } from './transaction';
import { CoinType } from './coin-type';
import { deriveEd25519 } from '../utils';

export class Balance {
  public address: string;
  public balance: string;
}

export abstract class Coin {
  abstract getPrivateKey(account: number): string;
  abstract getPublicKey(account: number): string;
  abstract getAddress(account: number): string;

  protected mnemonic: string;
  public privateAccount: UserAccount;

  constructor(mnemonic: string) {
    this.mnemonic = mnemonic;
  }

  async init(): Promise<void> {
    const sk = this.getPrivateSpendingKey();
    const coinName = this.getCoinType();
    const state = await UserState.init(`${coinName}.unique_user_id_here`); // FIXME: Replace with something user-specific (secret key hash?)

    try {
      const acc = new UserAccount(sk, state);
      this.privateAccount = acc;
    } catch (e) {
      console.error(e);
    }
  }

  generatePrivateAddress(): string {
    return this.privateAccount.generateAddress();
  }

  getPrivateSpendingKey(): Uint8Array {
    const path = CoinType.privateDerivationPath(this.getCoinType());
    const pair = deriveEd25519(path, this.mnemonic); // FIXME: Derive on BabyJubJub

    return reduceSpendingKey(pair.secretKey.slice(0, 32));
  }

  /**
   * Get native coin balance.
   */
  abstract getBalance(account: number): Promise<string>;

  /**
   * Get balances for specified number of accounts with offset.
   * @param numAccounts
   * @param offset
   */
  public async getBalances(numAccounts: number, offset: number = 0): Promise<Balance[]> {
    const promises: Promise<Balance>[] = [];

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

  /**
   * Transfer native coin.
   * @param to destination address
   * @param amount as base unit
   */
  abstract transfer(account: number, to: string, amount: string): Promise<void>;

  transferPrivate(account: number, outputs: Output[]): Promise<void> {
    // 1. Merge unspent notes
    // 2. Deposit, if needed
    // 3. Transfer
    throw new Error('unimplemented');
  }

  /**
   * Get current total private balance (account + unspent notes).
   */
  getPrivateBalance(): string {
    throw new Error('unimplemented');
  }

  /**
   * Fetch account transactions.
   */
  abstract getTransactions(account: number, limit?: number, offset?: number): Promise<Transaction[]>;

  /**
   * Subscribe to account events.
   */
  abstract subscribe(account: number): Promise<Observable<Transaction>>;

  /**
   * Convert human-readable representation of coin to smallest non-divisible (base) representation.
   * @param amount
   */
  abstract toBaseUnit(amount: string): string;

  /**
  * Convert coin represented with smallest non-divisible units to a human-readable representation.
  * @param amount
  */
  abstract fromBaseUnit(amount: string): string;

  /**
   * Get estimated transaction fee.
   */
  abstract estimateTxFee(): Promise<TxFee>;

  abstract getCoinType(): CoinType;

  async getNotes(): Promise<[string]> {
    throw new Error('unimplemented');
  }
}
