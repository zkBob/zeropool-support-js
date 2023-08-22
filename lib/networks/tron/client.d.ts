import { Client } from "../client";
import { Config } from '../../index';
import { TxFee } from "../transaction";
export declare class TronClient extends Client {
    protected tronWeb: any;
    protected address: string;
    constructor(rpc: string, privateKey: string, config: Config);
    haltClient(): void;
    getChainId(): Promise<number>;
    getTokenName(tokenAddress: string): Promise<string>;
    decimals(tokenAddress: string): Promise<number>;
    baseUnit(): string;
    toBaseUnit(humanAmount: string): string;
    fromBaseUnit(baseAmount: string): string;
    toBaseTokenUnit(tokenAddress: string, humanAmount: string): Promise<string>;
    fromBaseTokenUnit(tokenAddress: string, baseAmount: string): Promise<string>;
    getAddress(): Promise<string>;
    getBalance(): Promise<string>;
    getTokenBalance(tokenAddress: string): Promise<string>;
    getTokenNonce(tokenAddress: string): Promise<string>;
    allowance(tokenAddress: string, spender: string): Promise<bigint>;
    estimateTxFee(): Promise<TxFee>;
    sendTransaction(to: string, amount: bigint, data: string): Promise<string>;
    transfer(to: string, amount: string): Promise<string>;
    transferToken(tokenAddress: string, to: string, amount: string): Promise<string>;
    approve(tokenAddress: string, spender: string, amount: string): Promise<string>;
    increaseAllowance(tokenAddress: string, spender: string, additionalAmount: string): Promise<string>;
    private truncateHexPrefix;
}
