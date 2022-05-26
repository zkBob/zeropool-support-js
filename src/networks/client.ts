import { Transaction, TxFee } from './transaction';

/** Account number or address */
export type AccountId = number | string;

export abstract class Client {
  transactionUrl: string = '{{hash}}';

  abstract getAddress(): Promise<string>;
  getPublicKey(): Promise<string> {
    throw new Error('unimplemented');
  }

  public getChainId(): Promise<number> {
    throw new Error('unimplemented'); 
  };

  /**
   * Get native coin balance.
   */
  public abstract getBalance(): Promise<string>;

  public getTokenBalance(tokenAddress: string): Promise<string> {
    throw new Error('unimplemented');
  }

  public getTokenNonce(tokenAddress: string): Promise<string> {
    throw new Error('unimplemented');
  }

  public getTokenName(tokenAddress: string): Promise<string> {
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

  public getTransactionUrl(hash: string): string {
    return this.transactionUrl.replace('{{hash}}', hash);
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

  public async signTypedData(data: any): Promise<string> {
    throw new Error('unimplemented');
  }
}
