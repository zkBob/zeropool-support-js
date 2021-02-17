import { Observable } from 'rxjs';
import { Coin } from '../coin';
import { Transaction, TxFee } from '../transaction';
import { Config } from './config';
export declare class EthereumCoin implements Coin {
    private web3;
    private web3ws;
    private account;
    private keypair;
    private txStorage;
    constructor(seed: string, config: Config, account: number);
    getPrivateKey(): string;
    getPublicKey(): string;
    getAddress(): string;
    getBalance(): Promise<string>;
    transfer(to: string, amount: string): Promise<void>;
    getTransactions(limit: number, offset: number): Promise<Transaction[]>;
    subscribe(): Promise<Observable<Transaction>>;
    /**
     * Converts ether to Wei.
     * @param amount in Ether
     */
    toBaseUnit(amount: string): string;
    /**
     * Converts Wei to ether.
     * @param amount in Wei
     */
    fromBaseUnit(amount: string): string;
    estimateTxFee(): Promise<TxFee>;
    /**
     * Scans blocks for account transactions (both from and to)
     * @param startBlockNumber
     * @param endBlockNumber
     */
    private fetchAccountTransactions;
}
