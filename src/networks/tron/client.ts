import { Client } from "../client";
import { provider } from 'web3-core';

const TronWeb = require('tronweb')

export class TronClient extends Client {
    protected tronWeb;
    protected address: string;

    constructor(rpc: string, privateKey: string) {
        super();
        this.tronWeb = new TronWeb({
            fullHost: rpc,
            headers: { 'TRON-PRO-API-KEY': 'a659133c-224a-4438-89de-1575c4e5a59e' },
            privateKey
        });
        this.address = TronWeb.address.fromPrivateKey(this.truncateHexPrefix(privateKey));
    }

    public async getAddress(): Promise<string> {
        return this.address;
    }

    public async getBalance(): Promise<string> {
        return String(await this.tronWeb.trx.getBalance(await this.getAddress()));
    }

    public async transfer(to: string, amount: string): Promise<string> {
        throw new Error("Method not implemented.");
    }

    public async toBaseUnit(tokenAddress: string, amount: string): Promise<string> {
        throw new Error("Method not implemented.");
    }
    public async fromBaseUnit(tokenAddress: string, amount: string): Promise<string> {
        throw new Error("Method not implemented.");
    }

    private truncateHexPrefix(data: string): string {
        if (data.startsWith('0x')) {
            data = data.slice(2);
        }
        
        return data;
    }
    
}