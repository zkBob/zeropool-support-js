import { Observable } from 'rxjs';
import { Account } from 'near-api-js';
import { Coin } from '../coin';
import { Config } from './config';
import { Transaction, TxFee } from '../transaction';
export declare class NearCoin implements Coin {
    private keyStore;
    account: Account;
    private keypair;
    private config;
    private lastTxTimestamp;
    private rpc;
    constructor(mnemonic: string, config: Config, account: number);
    getPrivateKey(): string;
    getPublicKey(): string;
    getAddress(): string;
    getBalance(): Promise<string>;
    /**
     * @param to
     * @param amount in yoctoNEAR
     */
    transfer(to: string, amount: string): Promise<void>;
    getTransactions(limit?: number, offset?: number): Promise<Transaction[]>;
    subscribe(): Promise<Observable<Transaction>>;
    private fetchNewTransactions;
    /**
     * Convert human-readable NEAR to yoctoNEAR
     **/
    toBaseUnit(amount: string): string;
    /**
    * Convert yoctoNEAR to human-readable NEAR
    **/
    fromBaseUnit(amount: string): string;
    estimateTxFee(): Promise<TxFee>;
    private init;
    private ensureAccount;
}
