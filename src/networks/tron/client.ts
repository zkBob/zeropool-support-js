import { Client } from "../client";
import { provider } from 'web3-core';
import { Config } from '../../index';
import { TxFee } from "../transaction";

const TronWeb = require('tronweb')

export class TronClient extends Client {
    protected tronWeb;
    protected address: string;

    constructor(rpc: string, privateKey: string, config: Config) {
        super();
        this.tronWeb = new TronWeb({
            fullHost: rpc,
            privateKey
        });
        this.address = TronWeb.address.fromPrivateKey(this.truncateHexPrefix(privateKey));
        this.transactionUrl = config.transactionUrl;
    }

    public haltClient() {
        
    }

    // ------------------=========< Getting common data >=========-------------------
    // | ChainID, token name, token decimals                                        |
    // ------------------------------------------------------------------------------
    public async getChainId(): Promise<number> {
        throw new Error("Method not implemented.");
    }
    
    public getTokenName(tokenAddress: string): Promise<string> {
        throw new Error("Method not implemented.");
    }

    public decimals(tokenAddress: string): Promise<number> {
        throw new Error("Method not implemented.");
    }

    // ------------------=========< Conversion routines >=========-------------------
    // | Between base units and human-readable                                      |
    // ------------------------------------------------------------------------------
    public baseUnit(): string {
        return 'sun';
    }
    
    public toBaseUnit(humanAmount: string): string {
        return TronWeb.toSun(Number(humanAmount));
    }

    public fromBaseUnit(baseAmount: string): string {
        return TronWeb.fromSun(baseAmount)
    }
    
    public async toBaseTokenUnit(tokenAddress: string, humanAmount: string): Promise<string> {
        return humanAmount; // TODO
    }

    public async fromBaseTokenUnit(tokenAddress: string, baseAmount: string): Promise<string> {
        return baseAmount;  // TODO
    }


    // ----------------=========< Fetching address info >=========-------------------
    // | Native&token balances, nonces, etc                                         |
    // ------------------------------------------------------------------------------

    public async getAddress(): Promise<string> {
        return this.address;
    }

    public async getBalance(): Promise<string> {
        return String(await this.tronWeb.trx.getBalance(await this.getAddress()));
    }

    public async getTokenBalance(tokenAddress: string): Promise<string> {
        let abi = [{"outputs":[{"type":"uint256"}],"constant":true,"inputs":[{"name":"who","type":"address"}],"name":"balanceOf","stateMutability":"View","type":"Function"},{"outputs":[{"type":"bool"}],"inputs":[{"name":"_to","type":"address"},{"name":"_value","type":"uint256"}],"name":"transfer","stateMutability":"Nonpayable","type":"Function"}];
        let contract = await this.tronWeb.contract(abi, tokenAddress); 
        let result = await contract.balanceOf(await this.getAddress()).call();

        return result.toString(10);
    }

    public async getTokenNonce(tokenAddress: string): Promise<string> {
        throw new Error("Method not implemented.");
    }
    
    public async allowance(tokenAddress: string, spender: string): Promise<bigint> {
        throw new Error("Method not implemented.");
    }


    // ------------=========< Active blockchain interaction >=========---------------
    // | All actions related to the transaction sending                             |
    // ------------------------------------------------------------------------------

    public async estimateTxFee(): Promise<TxFee> {
        throw new Error("Method not implemented.");
    }

    public async sendTransaction(to: string, amount: bigint, data: string): Promise<string> {
        throw new Error("Method not implemented.");
    }

    public async transfer(to: string, amount: string): Promise<string> {
        throw new Error("Method not implemented.");
    }

    public transferToken(tokenAddress: string, to: string, amount: string): Promise<string> {
        throw new Error("Method not implemented.");
    }

    public async approve(tokenAddress: string, spender: string, amount: string): Promise<string> {
        throw new Error("Method not implemented.");
    }
    
    public async increaseAllowance(tokenAddress: string, spender: string, additionalAmount: string): Promise<string> {
        throw new Error("Method not implemented.");
    }


    // Private routines

    private truncateHexPrefix(data: string): string {
        if (data.startsWith('0x')) {
            data = data.slice(2);
        }
        
        return data;
    }
    
}