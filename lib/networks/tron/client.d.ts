import { Client } from "../client";
export declare class TronClient extends Client {
    protected tronWeb: any;
    protected address: string;
    constructor(rpc: string, privateKey: string);
    getAddress(): Promise<string>;
    getBalance(): Promise<string>;
    transfer(to: string, amount: string): Promise<string>;
    toBaseUnit(tokenAddress: string, amount: string): Promise<string>;
    fromBaseUnit(tokenAddress: string, amount: string): Promise<string>;
    private truncateHexPrefix;
}
