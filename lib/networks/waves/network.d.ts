import { Network } from "../network";
import { NetworkType } from "../network-type";
import { Transaction, TxFee } from "../transaction";
import { Config } from './config';
import { ZeroPoolState } from "../../state";
export declare class WavesNetwork extends Network {
    private config;
    private accounts;
    private api;
    private lastTxTimestamps;
    constructor(mnemonic: string, config: Config, state: ZeroPoolState, worker: any);
    getPrivateKey(account: number): string;
    getPublicKey(account: number): string;
    getAddress(account: number): string;
    getBalance(account: number): Promise<string>;
    transfer(account: number, to: string, amount: string): Promise<void>;
    getTransactions(account: number, limit?: number, offset?: number): Promise<Transaction[]>;
    toBaseUnit(amount: string): string;
    fromBaseUnit(amount: string): string;
    estimateTxFee(): Promise<TxFee>;
    getNetworkType(): NetworkType;
}
