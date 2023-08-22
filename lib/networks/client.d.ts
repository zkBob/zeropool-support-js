import { TxFee } from './transaction';
/** Account number or address */
export declare type AccountId = number | string;
export declare abstract class Client {
    transactionUrl: string;
    abstract haltClient(): void;
    getChainId(): Promise<number>;
    abstract getTokenName(tokenAddress: string): Promise<string>;
    abstract decimals(tokenAddress: string): Promise<number>;
    abstract baseUnit(): string;
    abstract toBaseUnit(humanAmount: string): string;
    abstract fromBaseUnit(baseAmount: string): string;
    abstract toBaseTokenUnit(tokenAddress: string, humanAmount: string): Promise<string>;
    abstract fromBaseTokenUnit(tokenAddress: string, baseAmount: string): Promise<string>;
    getTransactionUrl(hash: string): string;
    abstract getAddress(): Promise<string>;
    getPublicKey(): Promise<string>;
    abstract getBalance(): Promise<string>;
    abstract getTokenBalance(tokenAddress: string): Promise<string>;
    getTokenNonce(tokenAddress: string): Promise<string>;
    allowance(tokenAddress: string, spender: string): Promise<bigint>;
    estimateTxFee(): Promise<TxFee>;
    sendTransaction(to: string, amount: bigint, data: string): Promise<string>;
    abstract transfer(to: string, amount: string): Promise<string>;
    abstract transferToken(tokenAddress: string, to: string, amount: string): Promise<string>;
    approve(tokenAddress: string, spender: string, amount: string): Promise<string>;
    increaseAllowance(tokenAddress: string, spender: string, additionalAmount: string): Promise<string>;
    mint(tokenAddres: string, amount: string): Promise<string>;
    sign(data: string): Promise<string>;
    signTypedData(data: any): Promise<string>;
    getDirectDepositContract(poolAddress: string): Promise<string>;
    directDeposit(poolAddress: string, amount: string, zkAddress: string): Promise<string>;
}
