import { Observable } from 'rxjs';
import { Coin } from '../coin';
import { CoinType } from '../coin-type';
import { Transaction, TxFee } from '../transaction';
import { Config } from './config';
import { Output } from 'libzeropool-rs-wasm-bundler';
export declare class EthereumCoin extends Coin {
    private web3;
    private web3ws;
    private txStorage;
    private accounts;
    private contract;
    private config;
    constructor(mnemonic: string, config: Config);
    init(): Promise<void>;
    getPrivateKey(account: number): string;
    getPublicKey(account: number): string;
    getAddress(account: number): string;
    getBalance(account: number): Promise<string>;
    transfer(account: number, to: string, amount: string): Promise<void>;
    getTransactions(account: number, limit: number, offset: number): Promise<Transaction[]>;
    subscribe(account: number): Promise<Observable<Transaction>>;
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
    getCoinType(): CoinType;
    transferPrivate(account: number, outputs: Output[]): Promise<void>;
    getPrivateBalance(): string;
    private fetchNotes;
    /**
     * Scans blocks for account transactions (both from and to).
     * @param startBlockNumber
     * @param endBlockNumber
     * @param batchSize maximum number of parallel scans
     */
    private fetchAccountTransactions;
    /**
     * Scan block for account transactions.
     * @param address
     * @param blockNumber
     */
    private scanBlock;
}
