import Web3 from 'web3';
import { Output } from "../../libzeropool-rs";
import { Coin } from "../coin";
import { CoinType } from "../coin-type";
import { Transaction, TxFee } from "../transaction";
import { Config } from './config';
import { RelayerBackend } from './relayer';
export declare class EthereumCoin extends Coin {
    private web3;
    private txStorage;
    private accounts;
    private config;
    private relayer;
    private erc20;
    constructor(mnemonic: string, web3: Web3, config: Config, relayer: RelayerBackend, worker: any);
    protected init(): Promise<void>;
    getPrivateKey(account: number): string;
    getPublicKey(account: number): string;
    getAddress(account: number): string;
    getBalance(account: number): Promise<string>;
    transfer(account: number, to: string, amount: string): Promise<void>;
    getTransactions(account: number, limit: number, offset: number): Promise<Transaction[]>;
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
    withdrawPrivate(account: number, amount: string): Promise<void>;
    getPrivateBalance(): string;
    getPrivateBalances(): [string, string, string];
    updatePrivateState(): Promise<void>;
    /**
     * Attempt to extract and save usable account/notes from transaction data.
     * @param raw hex-encoded transaction data
     */
    private cachePrivateTx;
}
