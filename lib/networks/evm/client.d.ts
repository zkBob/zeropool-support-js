import { provider } from 'web3-core';
import { TxFee } from "../transaction";
import { Client } from "../client";
export declare class EthereumClient extends Client {
    private web3;
    private token;
    constructor(provider: provider);
    getAddress(): string;
    getBalance(): Promise<string>;
    getTokenBalance(tokenAddress: string): Promise<string>;
    transferToken(tokenAddress: string, to: string, amount: string): Promise<void>;
    transfer(to: string, amount: string): Promise<void>;
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
    mint(tokenAddress: string, amount: string): Promise<void>;
}
