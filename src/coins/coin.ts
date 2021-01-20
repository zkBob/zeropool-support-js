import { CoinType } from '@trustwallet/wallet-core';
import { Transaction } from './transaction';
import { Observable } from 'rxjs';

export interface Coin {
  getPrivateKey(): string;
  getPublicKey(): string;
  getAddress(): string;

  /**
   * Get native coin balance
   */
  getBalance(): Promise<string>;
  /**
   * Transfer native coin
   * @param to destination address
   * @param amount as base unit
   */
  transfer(to: string, amount: string): Promise<void>;

  /**
   * Get all transactions between two timestamps
   * @param from in seconds
   * @param to in seconds
   */
  getTransactions(from: number, to: number): Promise<Transaction[]>;

  /**
   * Subscribe to account events
   */
  subscribe(): Promise<Observable<Transaction>>;

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
}
