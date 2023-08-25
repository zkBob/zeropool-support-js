import { Client } from "../client";
import { Config } from '../../index';
import { TxFee } from "../transaction";

import tokenAbi from './abi/usdt-abi.json';
import poolAbi from './abi/pool-abi.json';
import ddAbi from './abi/dd-abi.json';

const TronWeb = require('tronweb')
const bs58 = require('bs58')

const DEFAULT_DECIMALS = 6;
const DEFAULT_CHAIN_ID = 0x2b6653dc;
const DEFAULT_ENERGY_FEE = 420;

export class TronClient extends Client {
    protected rpcUrl: string;
    protected tronWeb;
    protected address: string;
    // We need to cache a contract object for the each token address separately
    private tokenContracts = new Map<string, object>();  // tokenAddress -> contact object
    private poolContracts = new Map<string, object>();  // tokenAddress -> contact object
    private ddContracts = new Map<string, object>();  // tokenAddress -> contact object

    // blockchain long-lived cached parameters
    private chainId: number | undefined = undefined;
    private energyFee: number | undefined = undefined;
    private tokenSymbols = new Map<string, string>();  // tokenAddress -> token_symbol
    private tokenDecimals = new Map<string, number>();  // tokenAddress -> decimals
    private ddContractAddresses = new Map<string, string>();  // poolAddress -> ddQueueAddress

    constructor(rpc: string, privateKey: string, config: Config) {
        super();
        this.rpcUrl = rpc;
        if (!this.rpcUrl.endsWith('/')) this.rpcUrl += '/';

        this.tronWeb = new TronWeb({
            fullHost: this.rpcUrl,
            privateKey
        });
        this.address = TronWeb.address.fromPrivateKey(this.truncateHexPrefix(privateKey));
        this.transactionUrl = config.transactionUrl;
    }

    public haltClient() {
        
    }

    protected async getTokenContract(tokenAddres: string): Promise<any> {
        let contract = this.tokenContracts.get(tokenAddres);
        if (!contract) {
            contract = await this.tronWeb.contract(tokenAbi, tokenAddres);
            if (contract) {
                this.tokenContracts.set(tokenAddres, contract);
            } else {
                throw new Error(`Cannot initialize a contact object for the token ${tokenAddres}`);
            }
        }

        return contract;
    }

    protected async getPoolContract(poolAddres: string): Promise<any> {
        let contract = this.poolContracts.get(poolAddres);
        if (!contract) {
            contract = await this.tronWeb.contract(poolAbi, poolAddres);
            if (contract) {
                this.poolContracts.set(poolAddres, contract);
            } else {
                throw new Error(`Cannot initialize a contact object for the pool ${poolAddres}`);
            }
        }

        return contract;
    }

    protected async getDdContract(ddQueueAddress: string): Promise<any> {
        let contract = this.ddContracts.get(ddQueueAddress);
        if (!contract) {
            contract = await this.tronWeb.contract(ddAbi, ddQueueAddress);
            if (contract) {
                this.ddContracts.set(ddQueueAddress, contract);
            } else {
                throw new Error(`Cannot initialize a contact object for the DD queue ${ddQueueAddress}`);
            }
        }

        return contract;
    }

    // ------------------=========< Getting common data >=========-------------------
    // | ChainID, token name, token decimals                                        |
    // ------------------------------------------------------------------------------
    public async getChainId(): Promise<number> {
        if (this.chainId === undefined) {
            // tronweb cannot fetch chainId
            // so we should request it directly from the JSON RPC endpoint
            const tryUrls = [`${this.rpcUrl}jsonrpc`, this.rpcUrl];
            for (let aAttemptUrl of tryUrls) {
                try {
                    const chainId = await this.fetchChainIdFrom(aAttemptUrl);
                    this.chainId = chainId;
                    return chainId;
                } catch(err) {
                    console.warn(`Cannot fetch chainId from ${aAttemptUrl}: ${err.message}`);
                }
            }

            // unable to fetch
            console.warn(`Unable to get actual chainId. Will using default for Tron mainnet (${DEFAULT_CHAIN_ID})`)

            return DEFAULT_CHAIN_ID;
        }

        return this.chainId;
    }
    
    public async getTokenName(tokenAddress: string): Promise<string> {
        let res = this.tokenSymbols.get(tokenAddress);
        if (!res) {
            try {
                const token = await this.getTokenContract(tokenAddress);
                res = await token.symbol().call();
                if (typeof res === 'string') {
                    this.tokenSymbols.set(tokenAddress, res);
                } else {
                    throw new Error(`returned token symbol has ${typeof res} type (string expected)`);
                }
            } catch (err) {
                console.warn(`Cannot fetch symbol for the token ${tokenAddress}. Reason: ${err.message}`);
            }
        }
        
        return res ?? '';
    }

    public async decimals(tokenAddress: string): Promise<number> {
        let res = this.tokenDecimals.get(tokenAddress);
        if (!res) {
            try {
                const token = await this.getTokenContract(tokenAddress);
                res = Number(await token.decimals().call());
                this.tokenDecimals.set(tokenAddress, res);
            } catch (err) {
                console.warn(`Cannot fetch decimals for the token ${tokenAddress}, using default (${DEFAULT_DECIMALS}). Reason: ${err.message}`);
            }
        }
        
        return res ?? DEFAULT_DECIMALS;
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
        const decimals = BigInt(await this.decimals(tokenAddress));
        const wei = BigInt(this.toBaseUnit(humanAmount));

        const baseDecimals = 6n;
        const baseUnits = (decimals <= baseDecimals) ?
                        wei / (10n ** (baseDecimals - decimals)) :
                        wei * (10n ** (decimals - baseDecimals));

        return baseUnits.toString(10);
    }

    public async fromBaseTokenUnit(tokenAddress: string, baseAmount: string): Promise<string> {
        const decimals = BigInt(await this.decimals(tokenAddress));

        const baseDecimals = 6n;
        const wei = (decimals <= baseDecimals) ?
                    BigInt(baseAmount) * (10n ** (baseDecimals - decimals)) :
                    BigInt(baseAmount) / (10n ** (decimals - baseDecimals));

        return this.fromBaseUnit(wei.toString(10));
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
        const token = await this.getTokenContract(tokenAddress);
        let result = await token.balanceOf(await this.getAddress()).call();

        return result.toString(10);
    }

    public async getTokenNonce(tokenAddress: string): Promise<string> {
        throw new Error("Method not implemented.");
    }
    
    public async allowance(tokenAddress: string, spender: string): Promise<bigint> {
        const token = await this.getTokenContract(tokenAddress);
        let result = await token.allowance(await this.getAddress(), spender).call();

        return BigInt(result);
    }


    // ------------=========< Active blockchain interaction >=========---------------
    // | All actions related to the transaction sending                             |
    // ------------------------------------------------------------------------------

    public async estimateTxFee(): Promise<TxFee> {
        throw new Error("Method not implemented.");
    }

    public async sendTransaction(to: string, amount: bigint, data: string, selector: string): Promise<string> {
        // TODO: check it! Add validation 
        let tx = await this.tronWeb.transactionBuilder.triggerSmartContract(to, selector, { feeLimit: 100_000_000, rawParameter: this.truncateHexPrefix(data), callValue: Number(amount) }, []);
        const signedTx = await this.tronWeb.trx.sign(tx.transaction);
        const result = await this.tronWeb.trx.sendRawTransaction(signedTx);

        return result.txid;
    }

    public async transfer(to: string, amount: string): Promise<string> {
        const result = await this.tronWeb.trx.sendTransaction(to, amount);        
        if (result.result == true && result.transaction) {
            return result.transaction.txID;
        }

        if (result.message) {
            throw new Error(`${result.message ? this.tronWeb.toAscii(result.message) : 'no message'}`);    
        }
        throw new Error(`${result.code ?? 'TX ERROR'}`);
    }

    public async transferToken(tokenAddress: string, to: string, amount: string): Promise<string> {
        const selector = 'transfer(address,uint256)';
        const parameters = [{type: 'address', value: to}, {type: 'uint256', value: amount}]

        return this.verifyAndSendTx(tokenAddress, selector, parameters)
    }

    public async approve(tokenAddress: string, spender: string, amount: string): Promise<string> {
        const selector = 'approve(address,uint256)';
        const parameters = [{type: 'address', value: spender}, {type: 'uint256', value: amount}];
        
        return this.verifyAndSendTx(tokenAddress, selector, parameters)
    }
    
    public async increaseAllowance(tokenAddress: string, spender: string, additionalAmount: string): Promise<string> {
        const selector = 'increaseAllowance(address,uint256)';
        const parameters = [{type: 'address', value: spender}, {type: 'uint256', value: additionalAmount}]
        
        return this.verifyAndSendTx(tokenAddress, selector, parameters)
    }


    // ------------------=========< Signing routines >=========----------------------
    // | Signing data and typed data                                                |
    // ------------------------------------------------------------------------------

    public async sign(data: string): Promise<string> {
        return await this.tronWeb.trx.sign(data);
    }

    public async signTypedData(data: any): Promise<string> {
        if (data && data.domain && data.types && data.message) {
            return await this.tronWeb.trx._signTypedData(data.domain, data.types, data.message);
        }

        throw new Error('Incorrect signing request: it must contains at least domain, types and message keys')
    }


    // -----------------=========< High-level routines >=========--------------------
    // | Direct deposits routines                                                   |
    // ------------------------------------------------------------------------------

    public async getDirectDepositContract(poolAddress: string): Promise<string> {
        let ddContractAddr = this.ddContractAddresses.get(poolAddress);
        if (!ddContractAddr) {
            const pool = await this.getPoolContract(poolAddress);
            ddContractAddr = TronWeb.address.fromHex(await pool.direct_deposit_queue().call());
            if (typeof ddContractAddr === 'string') {
                this.ddContractAddresses.set(poolAddress, ddContractAddr);
            } else {
                throw new Error(`Cannot fetch DD contract address`);
            }
        }

        return ddContractAddr ?? '';
    }


    public async directDeposit(poolAddress: string, amount: string, zkAddress: string): Promise<string> {
        const address = await this.getAddress();
        let ddContractAddr = await this.getDirectDepositContract(poolAddress);
        const zkAddrBytes = `0x${Buffer.from(bs58.decode(zkAddress.substring(zkAddress.indexOf(':') + 1))).toString('hex')}`;

        const selector = 'directDeposit(address,uint256,bytes)';
        const parameters = [{type: 'address', value: address}, {type: 'uint256', value: amount}, {type: 'bytes', value: zkAddrBytes}];
        
        return this.verifyAndSendTx(ddContractAddr, selector, parameters);
    }


    // xxxxxxxxxxxxxxxxxxxxXXXXXXXXX< Private routines >XXXXXXXXXxxxxxxxxxxxxxxxxxxxxx
    // x Aux routines, sending and validating txs                                    x
    // xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

    private truncateHexPrefix(data: string): string {
        if (data.startsWith('0x')) {
            data = data.slice(2);
        }
        
        return data;
    }

    private addHexPrefix(data: string): string {
        return data.startsWith('0x') ? data : '0x' + data;
    }

    private async fetchChainIdFrom(url: string): Promise<number> {
        const body = {"jsonrpc":"2.0", "method": "eth_chainId", "params": [], "id": 1};
        const response = await fetch(url, {
            method: 'POST',
            body: JSON.stringify(body),
            headers: {'Content-Type': 'application/json; charset=UTF-8'} });
          
          if (!response.ok) {
            throw new Error(`Cannot fetch from JSON RPC (error ${response.status}): ${response.body ?? 'no description'}`);
          }
          
          const json = await response.json();
          if (json && json.result) {
            return Number(json.result);
          }

          throw new Error(`Cannot fetch from JSON RPC: incorrect response JSON (${json})`);
    }

    private async getEnergyCost(): Promise<number> {
        if (this.energyFee === undefined) {
            try {
                const chainParams = await this.tronWeb.trx.getChainParameters();
                for (let aParam of chainParams) {
                    if (aParam.key == 'getEnergyFee') {
                        this.energyFee = Number(aParam.value);
                        return this.energyFee;
                    }
                }

                console.warn(`Cannot get energy fee: no such key in chain parameters (getEnergyFee). Will using defaul ${DEFAULT_ENERGY_FEE}`);
            } catch(err) {
                console.warn(`Cannot get energy fee: ${err}`);
            }
        }

        return this.energyFee ?? DEFAULT_ENERGY_FEE;

    }

    private async getAccountEnergy(): Promise<number> {
        try {
            const accResources = await this.tronWeb.trx.getAccountResources(await this.getAddress());
            return Number(accResources.EnergyLimit ?? 0) - Number(accResources.EnergyUsed ?? 0);
        } catch(err) {
            console.warn(`Cannot get account energy: ${err}`);
        }
        
        return 0;
    }

    private async verifyAndSendTx(
        contractAddress: string,
        selector: string,
        parameters: Array<object>,
        feeLimit: number = 100_000_000,
        validateBalance: boolean = true,
    ): Promise<string> {
        // create tx to validate it's correct
        let tx = await this.tronWeb.transactionBuilder.triggerConstantContract(contractAddress, selector, { feeLimit }, parameters)
            .catch((err: string) => {
                throw new Error(`Tx validation error: ${err}`);
            });

        if (validateBalance) {
            // Check is sufficient resources for the fee
            const energyCost = await this.getEnergyCost();;
            const accEnergy = await this.getAccountEnergy();
            const accBalance = Number(await this.getBalance());
            const neededForFee = tx.energy_used * energyCost;
            // TODO: take into account bandwidth consumption
            if ((accBalance + energyCost * accEnergy) < neededForFee) {
                throw new Error(`Insufficient balance for fee (available ${accBalance} sun + ${accEnergy} energy, needed at least ${neededForFee})`)
            };
        }

        // create actual tx with feeLimit field
        // it's a tronweb bug: triggerConstantContract doesn't include feeLimit in the transaction
        // so it can be reverted in case of out-of-energy
        tx = await this.tronWeb.transactionBuilder.triggerSmartContract(contractAddress, selector, { feeLimit }, parameters);
        // sign and send
        const signedTx = await this.tronWeb.trx.sign(tx.transaction);
        const result = await this.tronWeb.trx.sendRawTransaction(signedTx);

        return result.txid;
    }
    
}