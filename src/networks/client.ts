import { Transaction, TxFee } from './transaction';

/** Account number or address */
export type AccountId = number | string;

export abstract class Client {
  abstract getAddress(): Promise<string>;
  getPublicKey(): Promise<string> {
    throw new Error('unimplemented');
  }

  /**
   * Get native coin balance.
   */
  public abstract getBalance(): Promise<string>;

  public getTokenBalance(tokenAddress: string): Promise<string> {
    throw new Error('unimplemented');
  }

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

  public approve(tokenAddress: string, spender: string, amount: string): Promise<void> {
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
