import { Output } from "libzeropool-rs-wasm-bundler";
import Web3 from "web3";
import { Config } from "../config";
import { ZeroPoolBackend } from "../../../zp/backend";
import { ZeroPoolState } from "../../../zp/state";
import { SnarkParams } from "../../../config";
export declare class DirectBackend extends ZeroPoolBackend {
    private web3;
    private config;
    private snarkParams;
    private tokenContract;
    constructor(web3: Web3, snarkParams: SnarkParams, config: Config, state: ZeroPoolState);
    transfer(privateKey: string, outs: Output[]): Promise<void>;
    deposit(privateKey: string, amount: string): Promise<void>;
    private approveAllowance;
    withdraw(privateKey: string, amount: string): Promise<void>;
    private signAndSendPrivateTx;
    getTotalBalance(): string;
    /**
     * @returns [total, account, note]
     */
    getBalances(): [string, string, string];
}
