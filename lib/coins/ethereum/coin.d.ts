import Web3 from 'web3';
import { Output } from "../../libzeropool-rs";
import { Coin } from "../coin";
import { CoinType } from "../coin-type";
import { Transaction, TxFee } from "../transaction";
import { Config } from './config';
import { RelayerBackend } from './relayer';
import { ZeroPoolState } from "../../state";
export declare class EthereumCoin extends Coin {
    private web3;
    private txStorage;
    private accounts;
    private config;
    private zp;
    private token;
    constructor(mnemonic: string, web3: Web3, config: Config, state: ZeroPoolState, zpBackend: RelayerBackend, worker: any);
    getPrivateKey(account: number): string;
    getPublicKey(account: number): string;
    getAddress(account: number): string;
    getBalance(account: number): Promise<string>;
    getTokenBalance(account: number, tokenAddress: string): Promise<string>;
    transferToken(account: number, tokenAddress: string, to: string, amount: string): Promise<void>;
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
    mint(account: number, tokenAddress: string, amount: string): Promise<void>;
    transferShielded(tokenAddress: string, outs: Output[]): Promise<void>;
    depositShielded(account: number, tokenAddress: string, amount: string): Promise<void>;
    withdrawShielded(account: number, tokenAddress: string, amount: string): Promise<void>;
    getPrivateBalance(): string;
    getPrivateBalances(): [string, string, string];
    free(): void;
}
