import { provider } from 'web3-core';
import { TxFee } from '../../networks/transaction';
import { Client } from '../../networks/client';
export interface Config {
    transactionUrl: string;
}
export declare class EthereumClient extends Client {
    private web3;
    private token;
    private minter;
    private pool;
    private dd;
    private ddContractAddresses;
    private tokenDecimals;
    gasMultiplier: number;
    constructor(provider: provider, config?: Config);
    getChainId(): Promise<number>;
    getAddress(): Promise<string>;
    getBalance(): Promise<string>;
    getTokenBalance(tokenAddress: string): Promise<string>;
    getTokenNonce(tokenAddress: string): Promise<string>;
    getTokenName(tokenAddress: string): Promise<string>;
    transfer(to: string, amount: string): Promise<string>;
    decimals(tokenAddress: string): Promise<number>;
    /**
     * Converts a token amount to the minimum supported resolution
     * Resolution depends on token's `decimal` property
     * @param amount in Ether\tokens
     */
    toBaseUnit(tokenAddress: string, amount: string): Promise<string>;
    /**
     * Converts Wei to ether.
     * @param amount in Wei
     */
    fromBaseUnit(tokenAddress: string, amount: string): Promise<string>;
    estimateTxFee(): Promise<TxFee>;
    mint(minterAddress: string, amount: string): Promise<string>;
    transferToken(tokenAddress: string, to: string, amount: string): Promise<string>;
    approve(tokenAddress: string, spender: string, amount: string): Promise<string>;
    increaseAllowance(tokenAddress: string, spender: string, additionalAmount: string): Promise<string>;
    allowance(tokenAddress: string, spender: string): Promise<bigint>;
    getDirectDepositContract(poolAddress: string): Promise<string>;
    directDeposit(poolAddress: string, amount: string, zkAddress: string): Promise<string>;
    sign(data: string): Promise<string>;
    signTypedData(data: object): Promise<string>;
}
