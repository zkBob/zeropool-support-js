import Web3 from 'web3';
import { Output } from "../../libzeropool-rs";
import { SnarkParams, Tokens } from "../../config";
import { ZeroPoolState } from "../../state";
export interface RelayerInfo {
    root: string;
    deltaIndex: string;
}
export declare class RelayerBackend {
    private zpState;
    private worker;
    private tokenContract;
    private web3;
    private snarkParams;
    private tokens;
    constructor(tokens: Tokens, web3: Web3, state: ZeroPoolState, snarkParams: SnarkParams, worker: any);
    mint(tokenAddress: string, privateKey: string, amount: string): Promise<void>;
    getTokenBalance(address: string, tokenAddress: string): Promise<any>;
    deposit(tokenAddress: string, privateKey: string, amountWei: string, fee?: string): Promise<void>;
    transfer(tokenAddress: string, outsWei: Output[], fee?: string): Promise<void>;
    withdraw(tokenAddress: string, privateKey: string, amountWei: string, fee?: string): Promise<void>;
    private approveAllowance;
    getTotalBalance(): string;
    /**
     * @returns [total, account, note]
     */
    getBalances(): [string, string, string];
    fetchTransactionsFromRelayer(tokenAddress: string): Promise<void>;
    updatePrivateState(tokenAddress: string): Promise<void>;
    /**
     * Attempt to extract and save usable account/notes from transaction data.
     * @param raw hex-encoded transaction data
     */
    private cachePrivateTx;
    free(): void;
}
