import { Transaction, TxFee } from './transaction';
import { Observable } from 'rxjs';
export interface Coin {
    getPrivateKey(account: number): string;
    getPublicKey(account: number): string;
    getAddress(account: number): string;
    /**
     * Get native coin balance.
     */
    getBalance(account: number): Promise<string>;
    /**
     * Transfer native coin.
     * @param to destination address
     * @param amount as base unit
     */
    transfer(account: number, to: string, amount: string): Promise<void>;
    /**
     * Fetch account transactions.
     */
    getTransactions(account: number, limit?: number, offset?: number): Promise<Transaction[]>;
    /**
     * Subscribe to account events.
     */
    subscribe(account: number): Promise<Observable<Transaction>>;
    /**
     * Convert human-readable representation of coin to smallest non-divisible (base) representation.
     * @param amount
     */
    toBaseUnit(amount: string): string;
    /**
    * Convert coin represented with smallest non-divisible units to a human-readable representation.
    * @param amount
    */
    fromBaseUnit(amount: string): string;
    /**
     * Get estimated transaction fee.
     */
    estimateTxFee(): Promise<TxFee>;
}
