import { Transaction, TxFee } from './transaction';

/** Account number or address */
export type AccountId = number | string;

export abstract class Client {
  transactionUrl: string = '{{hash}}';

  // lifecycle
  public abstract haltClient(): void;

  // getting neccessary data from the blockchain
  public getChainId(): Promise<number> { throw new Error('unimplemented'); };
  public abstract getTokenName(tokenAddress: string): Promise<string>;
  public abstract decimals(tokenAddress: string): Promise<number>;

  // informal & conversions
  public abstract baseUnit(): string;
  public abstract toBaseUnit(humanAmount: string): bigint;
  public abstract fromBaseUnit(baseAmount: bigint): string;
  public abstract toBaseTokenUnit(tokenAddress: string, humanAmount: string): Promise<bigint>;
  public abstract fromBaseTokenUnit(tokenAddress: string, baseAmount: bigint): Promise<string>;
  public getTransactionUrl(hash: string): string { return this.transactionUrl.replace('{{hash}}', hash); }


  // fetching address info
  public abstract getAddress(): Promise<string>
  public getPublicKey(): Promise<string> { throw new Error('unimplemented'); }
  public abstract getBalance(): Promise<bigint>;
  public abstract getTokenBalance(tokenAddress: string): Promise<bigint>
  public getTokenNonce(tokenAddress: string): Promise<number> { throw new Error('unimplemented'); }
  public allowance(tokenAddress: string, spender: string): Promise<bigint> { throw new Error('unimplemented'); }

  // active blockchain interaction
  public estimateTxFee(txObject?: any): Promise<TxFee> { throw new Error('unimplemented'); }
  public sendTransaction(to: string, amount: bigint, data: string, selector?: string): Promise<string> { throw new Error('unimplemented'); }
  public abstract transfer(to: string, amount: bigint): Promise<string>;
  public abstract transferToken(tokenAddress: string, to: string, amount: bigint): Promise<string>
  public approve(tokenAddress: string, spender: string, amount: bigint): Promise<string> { throw new Error('unimplemented'); }
  public increaseAllowance(tokenAddress: string, spender: string, additionalAmount: bigint): Promise<string> { throw new Error('unimplemented'); }
  public mint(tokenAddres: string, amount: bigint): Promise<string> { throw new Error('unimplemented'); }

  // signatures
  public sign(data: string): Promise<string> { throw new Error('unimplemented'); }
  public signTypedData(data: any): Promise<string> { throw new Error('unimplemented'); }

  // high-level routines
  public getDirectDepositContract(poolAddress: string): Promise<string> { throw new Error('unimplemented'); }
  public directDeposit(poolAddress: string, amount: bigint, zkAddress: string): Promise<string> { throw new Error('unimplemented'); }
}
