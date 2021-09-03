import { Observable } from 'rxjs';
import { Output, Params } from 'libzeropool-rs-wasm-bundler';
import { Coin } from '../coin';
import { CoinType } from '../coin-type';
import { Transaction, TxFee } from '../transaction';
import { Config } from './config';
export declare class EthereumCoin extends Coin {
    private web3;
    private web3ws;
    private txStorage;
    private accounts;
    private config;
    private params;
    private relayer;
    constructor(mnemonic: string, config: Config, params: Params);
    protected init(): Promise<void>;
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
    trasnferPrivateSimple(account: number, outs: Output[]): Promise<void>;
    depositPrivate(account: number, amount: string): Promise<void>;
    mergePrivate(): Promise<void>;
    withdrawPrivate(account: number, amount: string): Promise<void>;
    private prepareTranaction;
    getPrivateBalance(): string;
    /**
     * Attempt to extract and save usable account/notes from transaction data.
     * @param raw hex-encoded transaction data
     */
    private cachePrivateTx;
    updatePrivateState(): Promise<void>;
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
