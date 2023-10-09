import { TxFee } from './transaction';
/** Account number or address */
export declare type AccountId = number | string;
export declare abstract class Client {
    transactionUrl: string;
    abstract haltClient(): void;
    getChainId(): Promise<number>;
    abstract getBlockNumber(): Promise<number>;
    abstract getTokenName(tokenAddress: string): Promise<string>;
    abstract decimals(tokenAddress: string): Promise<number>;
    abstract baseUnit(): string;
    abstract toBaseUnit(humanAmount: string): bigint;
    abstract fromBaseUnit(baseAmount: bigint): string;
    abstract toBaseTokenUnit(tokenAddress: string, humanAmount: string): Promise<bigint>;
    abstract fromBaseTokenUnit(tokenAddress: string, baseAmount: bigint): Promise<string>;
    abstract validateAddress(address: string): boolean;
    getTransactionUrl(hash: string): string;
    abstract getAddress(): Promise<string>;
    getPublicKey(): Promise<string>;
    abstract getBalance(): Promise<bigint>;
    abstract getTokenBalance(tokenAddress: string): Promise<bigint>;
    getTokenNonce(tokenAddress: string): Promise<number>;
    allowance(tokenAddress: string, spender: string): Promise<bigint>;
    estimateTxFee(txObject?: any): Promise<TxFee>;
    sendTransaction(to: string, amount: bigint, data: string, selector?: string): Promise<string>;
    abstract transfer(to: string, amount: bigint): Promise<string>;
    abstract transferToken(tokenAddress: string, to: string, amount: bigint): Promise<string>;
    approve(tokenAddress: string, spender: string, amount: bigint): Promise<string>;
    increaseAllowance(tokenAddress: string, spender: string, additionalAmount: bigint): Promise<string>;
    mint(tokenAddres: string, amount: bigint): Promise<string>;
    sign(data: string): Promise<string>;
    signTypedData(data: any): Promise<string>;
    getDirectDepositContract(poolAddress: string): Promise<string>;
    directDeposit(poolAddress: string, amount: bigint, zkAddress: string): Promise<string>;
}
