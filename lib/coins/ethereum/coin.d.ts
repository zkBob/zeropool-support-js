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
    private transferParams;
    private treeParams;
    private relayer;
    private tokenContract;
    constructor(mnemonic: string, config: Config, transferParams: Params, treeParams: Params);
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
    /**
     * coin.transferPublicToPrivate(0, [{ to: 'addr', amount: '123' }])
     * @param account
     * @param outputs
     */
    transferPublicToPrivate(account: number, outputs: Output[]): Promise<void>;
    transferPrivateToPrivate(account: number, outs: Output[]): Promise<void>;
    depositPrivate(account: number, amount: string): Promise<void>;
    private approveAllowance;
    withdrawPrivate(account: number, amount: string): Promise<void>;
    private signAndSendPrivateTx;
    getPrivateBalance(): string;
    /**
     * Attempt to extract and save usable account/notes from transaction data.
     * @param raw hex-encoded transaction data
     */
    private cachePrivateTx;
    updatePrivateState(): Promise<void>;
}
