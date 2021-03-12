import { Transaction, TxFee } from './transaction';
import { Observable } from 'rxjs';
import { CoinType } from './coin-type';
import { Pubkey } from 'hdwallet-babyjub';

export class Balance {
  public address: string;
  public balance: string;
}

export abstract class Coin {
  abstract getPrivateKey(account: number): string;
  abstract getPublicKey(account: number): string;
  abstract getAddress(account: number): string;

  protected mnemonic: string;

  constructor(mnemonic: string) {
    this.mnemonic = mnemonic;
  }

  getPrivateAddress(account: number, index: number): string {
    const path = CoinType.privateDerivationPath(this.getCoinType(), account);
    console.warn('TODO getPrivateAddress');

    const { K } = Pubkey(this.mnemonic, path);

    // TODO: Derive with libzeropool-wasm
    // const { k } = Privkey(this.mnemonic, path);

    return '';
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
}
