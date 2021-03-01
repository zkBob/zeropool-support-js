import { Observable } from 'rxjs';
import { Coin } from '../coin';
import { Config } from './config';
import { Transaction, TxFee } from '../transaction';
export declare class WavesCoin extends Coin {
    private mnemonic;
    private config;
    constructor(mnemonic: string, config: Config);
    getPrivateKey(account: number): string;
    getPublicKey(account: number): string;
    getAddress(account: number): string;
    getBalance(account: number): Promise<string>;
    getBalances(numAccounts: number, offset?: number): Promise<(string | Error)[]>;
    transfer(account: number, to: string, amount: string): Promise<void>;
    getTransactions(account: number, limit?: number, offset?: number): Promise<Transaction[]>;
    subscribe(account: number): Promise<Observable<Transaction>>;
    toBaseUnit(amount: string): string;
    fromBaseUnit(amount: string): string;
    estimateTxFee(): Promise<TxFee>;
}
