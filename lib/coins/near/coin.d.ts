import { Observable } from 'rxjs';
import { Coin } from '../coin';
import { Config } from './config';
import { Transaction, TxFee } from '../transaction';
export declare class NearCoin extends Coin {
    private keyStore;
    private config;
    private lastTxTimestamp;
    private rpc;
    private accounts;
    private mnemonic;
    constructor(mnemonic: string, config: Config);
    getPrivateKey(account: number): string;
    getPublicKey(account: number): string;
    getAddress(account: number): string;
    getBalance(accountIndex: number): Promise<string>;
    /**
     * @param to
     * @param amount in yoctoNEAR
     */
    transfer(accountIndex: number, to: string, amount: string): Promise<void>;
    getTransactions(accountIndex: number, limit?: number, offset?: number): Promise<Transaction[]>;
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
}
