import { Coin } from "../coin";
import { CoinType } from "../coin-type";
import { Transaction, TxFee } from "../transaction";
import { Config } from './config';
export declare class NearCoin extends Coin {
    private keyStore;
    private config;
    private lastTxTimestamps;
    private rpc;
    private accounts;
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
    getCoinType(): CoinType;
}
