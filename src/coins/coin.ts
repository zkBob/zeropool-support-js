import { UserAccount, reduceSpendingKey, UserState, Output } from '../libzeropool-rs';;
import { hash } from 'tweetnacl';

import { Transaction, TxFee } from './transaction';
import { CoinType } from './coin-type';
import { bufToHex, deriveEd25519 } from '@/utils';

export class Balance {
  public address: string;
  public balance: string;
}

export abstract class Coin {
  abstract getPrivateKey(account: number): string;
  abstract getPublicKey(account: number): string;
  abstract getAddress(account: number): string;

  public privateAccount: UserAccount;
  protected mnemonic: string;
  protected worker: any;
  private initPromise: Promise<void>;

  constructor(mnemonic: string, worker: any) {
    this.mnemonic = mnemonic;
    this.initPromise = this.init();
    this.worker = worker;
  }

  protected async init(): Promise<void> {
    const sk = this.getPrivateSpendingKey();
    const coinName = this.getCoinType();
    const userId = bufToHex(hash(sk));
    const state = await UserState.init(`zp.${coinName}.${userId}`);

    try {
      const acc = new UserAccount(sk, state);
      this.privateAccount = acc;
    } catch (e) {
      console.error(e);
    }
  }

  async ready(): Promise<void> {
    await this.initPromise;
  }

  generatePrivateAddress(): string {
    return this.privateAccount.generateAddress();
  }

  isOwnPrivateAddress(address: string): boolean {
    return this.privateAccount.isOwnAddress(address);
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

  // TODO: Extract private tx methods into a separate class
  transferPublicToPrivate(account: number, outputs: Output[]): Promise<void> {
    throw new Error('unimplemented');
  }

  transferPrivateToPrivate(account: number, outputs: Output[]): Promise<void> {
    throw new Error('unimplemented');
  }

  depositPrivate(account: number, amount: string): Promise<void> {
    throw new Error('unimplemented');
  }

  mergePrivate(): Promise<void> {
    throw new Error('unimplemented');
  }

  withdrawPrivate(account: number, amount: string): Promise<void> {
    throw new Error('unimplemented');
  }

  /**
   * Get current total private balance (account + unspent notes).
   */
  getPrivateBalance(): string {
    throw new Error('unimplemented');
  }

  /**
 * Get total, account, and note balances.
 */
  getPrivateBalances(): [string, string, string] {
    throw new Error('unimplemented');
  }

  updatePrivateState(): Promise<void> {
    throw new Error('unimplemented');
  }

  /**
   * Fetch account transactions.
   */
  abstract getTransactions(account: number, limit?: number, offset?: number): Promise<Transaction[]>;

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
