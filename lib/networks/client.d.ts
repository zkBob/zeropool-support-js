import { TxFee } from './transaction';
/** Account number or address */
export declare type AccountId = number | string;
export declare abstract class Client {
    transactionUrl: string;
    abstract getAddress(): Promise<string>;
    getPublicKey(): Promise<string>;
    getChainId(): Promise<number>;
    /**
     * Get native coin balance.
     */
    abstract getBalance(): Promise<string>;
    getTokenBalance(tokenAddress: string): Promise<string>;
    getTokenNonce(tokenAddress: string): Promise<string>;
    getTokenName(tokenAddress: string): Promise<string>;
    /**
     * Transfer native coin.
     * @param to destination address
     * @param amount as base unit
     */
    abstract transfer(to: string, amount: string): Promise<void>;
    transferToken(tokenAddress: string, to: string, amount: string): Promise<void>;
    mint(tokenAddres: string, amount: string): Promise<void>;
    approve(tokenAddress: string, spender: string, amount: string): Promise<void>;
    getTransactionUrl(hash: string): string;
    /**
     *
     */
    updateState(): Promise<void>;
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
    estimateTxFee(): Promise<TxFee>;
    sign(data: string): Promise<string>;
    signTypedData(data: any): Promise<string>;
}
