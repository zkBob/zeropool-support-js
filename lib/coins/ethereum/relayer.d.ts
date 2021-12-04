import Web3 from 'web3';
import { Output, Proof } from "../../libzeropool-rs";
import { SnarkParams } from "../../config";
import { ZeroPoolState } from "../../state";
import { Config } from './config';
import { TxType } from './private-tx';
export interface RelayerInfo {
    root: string;
    deltaIndex: string;
}
export declare class RelayerAPI {
    private url;
    constructor(url: URL);
    updateUrl(newUrl: URL): void;
    fetchTransactions(offset: BigInt, limit?: number): Promise<string[]>;
    sendTransaction(proof: Proof, memo: string, txType: TxType, withdrawSignature?: string): Promise<void>;
    info(): Promise<RelayerInfo>;
}
export declare class RelayerBackend {
    private zpState;
    private worker;
    private relayer;
    private tokenContract;
    private config;
    private web3;
    private snarkParams;
    constructor(url: URL, web3: Web3, state: ZeroPoolState, snarkParams: SnarkParams, config: Config, worker: any);
    deposit(privateKey: string, amountWei: string, fee?: string): Promise<void>;
    transfer(_privateKey: string, outsWei: Output[], fee?: string): Promise<void>;
    withdraw(privateKey: string, amountWei: string, fee?: string): Promise<void>;
    private approveAllowance;
    getTotalBalance(): string;
    /**
     * @returns [total, account, note]
     */
    getBalances(): [string, string, string];
}
