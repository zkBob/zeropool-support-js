import { Transaction, TxFee } from './transaction';

/** Account number or address */
export type AccountId = number | string;

export abstract class Client {
  abstract getAddress(): string;

  /**
   * Get native coin balance.
   */
  public abstract getBalance(): Promise<string>;

  public getTokenBalance(tokenAddress: string): Promise<string> {
    throw new Error('unimplemented');
  }

  // /**
  //  * Get balances for specified number of accounts with offset.
  //  * @param numAccounts
  //  * @param offset
  //  */
  // public async getBalances(numAccounts: number, offset: number = 0): Promise<Balance[]> {
  //   const promises: Promise<Balance>[] = [];

  //   for (let account = offset; account < offset + numAccounts; ++account) {
  //     const promise = this.getBalance()
  //       .catch(_err => '0') // TODO: Log errors
  //       .then((balance) => ({
  //         address: this.getAddress(),
  //         balance,
  //       }));

  //     promises.push(promise);
  //   }

  //   return Promise.all(promises);
  // }

  /**
   * Transfer native coin.
   * @param to destination address
   * @param amount as base unit
   */
  abstract transfer(to: string, amount: string): Promise<void>;

  public transferToken(tokenAddress: string, to: string, amount: string): Promise<void> {
    throw new Error('unimplemented');
  }

  public mint(tokenAddres: string, amount: string): Promise<void> {
    throw new Error('unimplemented');
  }

  /**
   * 
   */
  public updateState(): Promise<void> {
    throw new Error('unimplemented');
  }

  // /**
  //  * Fetch account transactions.
  //  */
  // public abstract getTransactions(limit?: number, offset?: number): Promise<Transaction[]>;

  /**
   * Convert human-readable representation of coin to smallest non-divisible (base) representation.
   * @param amount
   */
  public abstract toBaseUnit(amount: string): string;

  /**
  * Convert coin represented with smallest non-divisible units to a human-readable representation.
  * @param amount
  */
  public abstract fromBaseUnit(amount: string): string;

  /**
   * Get estimated transaction fee.
   */
  public estimateTxFee(): Promise<TxFee> {
    throw new Error('unimplemented');
  }

  public async sign(data: string): Promise<string> {
    throw new Error('unimplemented');
  }
}
