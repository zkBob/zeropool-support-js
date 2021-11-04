import { Output, Proof } from "libzeropool-rs-wasm-bundler";
import Web3 from "web3";
import { Config } from "..";
import { SnarkParams } from "../../../config";
import { ZeroPoolBackend } from "../../../zp/backend";
import { ZeroPoolState } from "../../../zp/state";
import { TxType } from "../private-tx";
export interface RelayerInfo {
    root: string;
    deltaIndex: string;
}
export declare class RelayerAPI {
    url: URL;
    constructor(url: URL);
    fetchTransactions(offset: BigInt, limit?: number): Promise<string[]>;
    sendTransaction(proof: Proof, memo: string, txType: TxType, withdrawSignature?: string): Promise<void>;
    info(): Promise<RelayerInfo>;
}
export declare class RelayerBackend extends ZeroPoolBackend {
    private relayer;
    private tokenContract;
    private config;
    private web3;
    private snarkParams;
    constructor(url: URL, web3: Web3, state: ZeroPoolState, snarkParams: SnarkParams, config: Config);
    transfer(_privateKey: string, outsWei: Output[]): Promise<void>;
    deposit(privateKey: string, amountWei: string): Promise<void>;
    withdraw(privateKey: string, amountWei: string): Promise<void>;
    private approveAllowance;
}
