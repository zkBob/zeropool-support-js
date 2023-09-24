"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TronClient = void 0;
const client_1 = require("../client");
const usdt_abi_json_1 = __importDefault(require("./abi/usdt-abi.json"));
const pool_abi_json_1 = __importDefault(require("../evm/abi/pool-abi.json"));
const dd_abi_json_1 = __importDefault(require("../evm/abi/dd-abi.json"));
const web3_utils_1 = require("web3-utils");
const promise_retry_1 = __importDefault(require("promise-retry"));
const TronWeb = require('tronweb');
const bs58 = require('bs58');
const DEFAULT_DECIMALS = 6;
const DEFAULT_CHAIN_ID = 0x2b6653dc;
const DEFAULT_ENERGY_FEE = 420;
const RETRY_COUNT = 5;
class TronClient extends client_1.Client {
    constructor(rpc, privateKey, config) {
        super();
        // We need to cache a contract object for the each token address separately
        this.tokenContracts = new Map(); // tokenAddress -> contact object
        this.poolContracts = new Map(); // tokenAddress -> contact object
        this.ddContracts = new Map(); // tokenAddress -> contact object
        // blockchain long-lived cached parameters
        this.chainId = undefined;
        this.energyFee = undefined;
        this.tokenSymbols = new Map(); // tokenAddress -> token_symbol
        this.tokenDecimals = new Map(); // tokenAddress -> decimals
        this.ddContractAddresses = new Map(); // poolAddress -> ddQueueAddress
        this.rpcUrl = rpc;
        if (!this.rpcUrl.endsWith('/'))
            this.rpcUrl += '/';
        this.tronWeb = new TronWeb({
            fullHost: this.rpcUrl,
            privateKey
        });
        this.address = TronWeb.address.fromPrivateKey(this.truncateHexPrefix(privateKey));
        this.transactionUrl = config.transactionUrl;
    }
    haltClient() {
    }
    contractCallRetry(contract, method, args = []) {
        return this.commonRpcRetry(async () => {
            return await contract[method](...args).call();
        }, `[SupportJS] Contract call (${method}) error`, RETRY_COUNT);
    }
    commonRpcRetry(closure, errorPattern, retriesCnt) {
        return (0, promise_retry_1.default)(async (retry, attempt) => {
            try {
                return await closure();
            }
            catch (e) {
                console.error(`${errorPattern ?? '[SupportJS] Error occured'} [attempt #${attempt}]: ${e.message}`);
                retry(e);
            }
        }, {
            retries: retriesCnt,
            minTimeout: 500,
            maxTimeout: 500,
        });
    }
    async getTokenContract(tokenAddres) {
        let contract = this.tokenContracts.get(tokenAddres);
        if (!contract) {
            contract = await this.tronWeb.contract(usdt_abi_json_1.default, tokenAddres);
            if (contract) {
                this.tokenContracts.set(tokenAddres, contract);
            }
            else {
                throw new Error(`[SupportJS] Cannot initialize a contact object for the token ${tokenAddres}`);
            }
        }
        return contract;
    }
    async getPoolContract(poolAddres) {
        let contract = this.poolContracts.get(poolAddres);
        if (!contract) {
            contract = await this.tronWeb.contract(pool_abi_json_1.default, poolAddres);
            if (contract) {
                this.poolContracts.set(poolAddres, contract);
            }
            else {
                throw new Error(`[SupportJS] Cannot initialize a contact object for the pool ${poolAddres}`);
            }
        }
        return contract;
    }
    async getDdContract(ddQueueAddress) {
        let contract = this.ddContracts.get(ddQueueAddress);
        if (!contract) {
            contract = await this.tronWeb.contract(dd_abi_json_1.default, ddQueueAddress);
            if (contract) {
                this.ddContracts.set(ddQueueAddress, contract);
            }
            else {
                throw new Error(`[SupportJS] Cannot initialize a contact object for the DD queue ${ddQueueAddress}`);
            }
        }
        return contract;
    }
    // ------------------=========< Getting common data >=========-------------------
    // | ChainID, token name, token decimals                                        |
    // ------------------------------------------------------------------------------
    async getChainId() {
        if (this.chainId === undefined) {
            // tronweb cannot fetch chainId
            // so we should request it directly from the JSON RPC endpoint
            const tryUrls = [`${this.rpcUrl}jsonrpc`, this.rpcUrl];
            for (let aAttemptUrl of tryUrls) {
                try {
                    const chainId = await this.commonRpcRetry(() => {
                        return this.fetchChainIdFrom(aAttemptUrl);
                    }, `[SupportJS] Cannot get chain ID from ${aAttemptUrl}`, 2);
                    this.chainId = chainId;
                    return chainId;
                }
                catch (err) {
                    console.warn(`[SupportJS] Cannot fetch chainId from ${aAttemptUrl}: ${err.message}`);
                }
            }
            // unable to fetch
            console.warn(`[SupportJS] Unable to get actual chainId. Will using default for Tron mainnet (${DEFAULT_CHAIN_ID})`);
            return DEFAULT_CHAIN_ID;
        }
        return this.chainId;
    }
    async getBlockNumber() {
        return this.commonRpcRetry(async () => {
            const block = await this.tronWeb.trx.getCurrentBlock();
            return block.block_header.raw_data.number;
        }, '[SupportJS] Cannot get block number', RETRY_COUNT);
    }
    async getTokenName(tokenAddress) {
        let res = this.tokenSymbols.get(tokenAddress);
        if (!res) {
            try {
                const token = await this.getTokenContract(tokenAddress);
                res = await this.contractCallRetry(token, 'symbol');
                if (typeof res === 'string') {
                    this.tokenSymbols.set(tokenAddress, res);
                }
                else {
                    throw new Error(`[SupportJS] returned token symbol has ${typeof res} type (string expected)`);
                }
            }
            catch (err) {
                console.warn(`[SupportJS] Cannot fetch symbol for the token ${tokenAddress}. Reason: ${err.message}`);
            }
        }
        return res ?? '';
    }
    async decimals(tokenAddress) {
        let res = this.tokenDecimals.get(tokenAddress);
        if (!res) {
            try {
                const token = await this.getTokenContract(tokenAddress);
                res = Number(await this.contractCallRetry(token, 'decimals'));
                this.tokenDecimals.set(tokenAddress, res);
            }
            catch (err) {
                console.warn(`[SupportJS] Cannot fetch decimals for the token ${tokenAddress}, using default (${DEFAULT_DECIMALS}). Reason: ${err.message}`);
            }
        }
        return res ?? DEFAULT_DECIMALS;
    }
    // ------------------=========< Conversion routines >=========-------------------
    // | Between base units and human-readable                                      |
    // ------------------------------------------------------------------------------
    baseUnit() {
        return 'sun';
    }
    toBaseUnit(humanAmount) {
        return BigInt(TronWeb.toSun(Number(humanAmount)));
    }
    fromBaseUnit(baseAmount) {
        return TronWeb.fromSun(baseAmount.toString());
    }
    async toBaseTokenUnit(tokenAddress, humanAmount) {
        const decimals = BigInt(await this.decimals(tokenAddress));
        const wei = BigInt(this.toBaseUnit(humanAmount));
        const baseDecimals = 6n;
        const baseUnits = (decimals <= baseDecimals) ?
            wei / (10n ** (baseDecimals - decimals)) :
            wei * (10n ** (decimals - baseDecimals));
        return baseUnits;
    }
    async fromBaseTokenUnit(tokenAddress, baseAmount) {
        const decimals = BigInt(await this.decimals(tokenAddress));
        const baseDecimals = 6n;
        const wei = (decimals <= baseDecimals) ?
            BigInt(baseAmount) * (10n ** (baseDecimals - decimals)) :
            BigInt(baseAmount) / (10n ** (decimals - baseDecimals));
        return this.fromBaseUnit(wei);
    }
    validateAddress(address) {
        return TronWeb.isAddress(address);
    }
    // ----------------=========< Fetching address info >=========-------------------
    // | Native&token balances, nonces, etc                                         |
    // ------------------------------------------------------------------------------
    async getAddress() {
        return this.address;
    }
    async getBalance() {
        return this.commonRpcRetry(async () => {
            return BigInt(await this.tronWeb.trx.getBalance(await this.getAddress()));
        }, '[SupportJS] Cannot get native balance', RETRY_COUNT);
    }
    async getTokenBalance(tokenAddress) {
        const token = await this.getTokenContract(tokenAddress);
        let result = await this.contractCallRetry(token, 'balanceOf', [await this.getAddress()]);
        return BigInt(result);
    }
    async getTokenNonce(tokenAddress) {
        throw new Error("[SupportJS] Method not implemented");
    }
    async allowance(tokenAddress, spender) {
        const token = await this.getTokenContract(tokenAddress);
        let result = await this.contractCallRetry(token, 'allowance', [await this.getAddress(), spender]);
        return BigInt(result);
    }
    // ------------=========< Active blockchain interaction >=========---------------
    // | All actions related to the transaction sending                             |
    // ------------------------------------------------------------------------------
    async estimateTxFee() {
        throw new Error("[SupportJS] Method not implemented.");
    }
    async sendTransaction(to, amount, data, selector) {
        // TODO: check it! Add validation 
        const txObject = {
            feeLimit: 100000000,
            rawParameter: this.truncateHexPrefix(data),
            callValue: Number(amount)
        };
        let tx = await this.tronWeb.transactionBuilder.triggerSmartContract(to, selector, txObject, []);
        const signedTx = await this.tronWeb.trx.sign(tx.transaction);
        const result = await this.commonRpcRetry(async () => {
            return this.tronWeb.trx.sendRawTransaction(signedTx);
        }, '[SupportJS] Unable to send transaction', RETRY_COUNT);
        return result.txid;
    }
    async transfer(to, amount) {
        const result = await await this.commonRpcRetry(async () => {
            return this.tronWeb.trx.sendTransaction(to, amount.toString(10));
        }, '[SupportJS] Unable to send transaction', RETRY_COUNT);
        if (result.result == true && result.transaction) {
            return result.transaction.txID;
        }
        if (result.message) {
            throw new Error(`${result.message ? this.tronWeb.toAscii(result.message) : 'no message'}`);
        }
        throw new Error(`${result.code ?? 'TX ERROR'}`);
    }
    async transferToken(tokenAddress, to, amount) {
        const selector = 'transfer(address,uint256)';
        const parameters = [{ type: 'address', value: to }, { type: 'uint256', value: amount.toString(10) }];
        return this.verifyAndSendTx(tokenAddress, selector, parameters);
    }
    async approve(tokenAddress, spender, amount) {
        const selector = 'approve(address,uint256)';
        const parameters = [{ type: 'address', value: spender }, { type: 'uint256', value: amount.toString(10) }];
        return this.verifyAndSendTx(tokenAddress, selector, parameters);
    }
    async increaseAllowance(tokenAddress, spender, additionalAmount) {
        const selector = 'increaseAllowance(address,uint256)';
        const parameters = [{ type: 'address', value: spender }, { type: 'uint256', value: additionalAmount.toString(10) }];
        return this.verifyAndSendTx(tokenAddress, selector, parameters);
    }
    // ------------------=========< Signing routines >=========----------------------
    // | Signing data and typed data                                                |
    // ------------------------------------------------------------------------------
    async sign(data) {
        if (typeof data === 'string') {
            const bytes = (0, web3_utils_1.hexToBytes)(data);
            return this.tronWeb.trx.signMessageV2(bytes);
        }
        throw new Error('Incorrect signing request: data must be a hex string');
    }
    async signTypedData(data) {
        if (data && data.domain && data.types && data.message) {
            return this.tronWeb.trx._signTypedData(data.domain, data.types, data.message);
        }
        throw new Error('Incorrect signing request: it must contains at least domain, types and message keys');
    }
    // -----------------=========< High-level routines >=========--------------------
    // | Direct deposits routines                                                   |
    // ------------------------------------------------------------------------------
    async getDirectDepositContract(poolAddress) {
        let ddContractAddr = this.ddContractAddresses.get(poolAddress);
        if (!ddContractAddr) {
            const pool = await this.getPoolContract(poolAddress);
            const ddRawAddr = await this.contractCallRetry(pool, 'direct_deposit_queue');
            ddContractAddr = TronWeb.address.fromHex(ddRawAddr);
            if (typeof ddContractAddr === 'string') {
                this.ddContractAddresses.set(poolAddress, ddContractAddr);
            }
            else {
                throw new Error(`Cannot fetch DD contract address`);
            }
        }
        return ddContractAddr ?? '';
    }
    async directDeposit(poolAddress, amount, zkAddress) {
        const address = await this.getAddress();
        let ddContractAddr = await this.getDirectDepositContract(poolAddress);
        const zkAddrBytes = `0x${Buffer.from(bs58.decode(zkAddress.substring(zkAddress.indexOf(':') + 1))).toString('hex')}`;
        const selector = 'directDeposit(address,uint256,bytes)';
        const parameters = [{ type: 'address', value: address }, { type: 'uint256', value: amount.toString(10) }, { type: 'bytes', value: zkAddrBytes }];
        return this.verifyAndSendTx(ddContractAddr, selector, parameters);
    }
    // xxxxxxxxxxxxxxxxxxxxXXXXXXXXX< Private routines >XXXXXXXXXxxxxxxxxxxxxxxxxxxxxx
    // x Aux routines, sending and validating txs                                    x
    // xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
    truncateHexPrefix(data) {
        if (data.startsWith('0x')) {
            data = data.slice(2);
        }
        return data;
    }
    addHexPrefix(data) {
        return data.startsWith('0x') ? data : '0x' + data;
    }
    async fetchChainIdFrom(url) {
        const body = { "jsonrpc": "2.0", "method": "eth_chainId", "params": [], "id": 1 };
        const response = await fetch(url, {
            method: 'POST',
            body: JSON.stringify(body),
            headers: { 'Content-Type': 'application/json; charset=UTF-8' }
        });
        if (!response.ok) {
            throw new Error(`Cannot fetch from JSON RPC (error ${response.status}): ${response.body ?? 'no description'}`);
        }
        const json = await response.json();
        if (json && json.result) {
            return Number(json.result);
        }
        throw new Error(`Cannot fetch from JSON RPC: incorrect response JSON (${json})`);
    }
    async getEnergyCost() {
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
            }
            catch (err) {
                console.warn(`Cannot get energy fee: ${err}`);
            }
        }
        return this.energyFee ?? DEFAULT_ENERGY_FEE;
    }
    async getAccountEnergy() {
        try {
            const accResources = await this.tronWeb.trx.getAccountResources(await this.getAddress());
            return Number(accResources.EnergyLimit ?? 0) - Number(accResources.EnergyUsed ?? 0);
        }
        catch (err) {
            console.warn(`[SupportJS] Cannot get account energy: ${err}`);
        }
        return 0;
    }
    async verifyAndSendTx(contractAddress, selector, parameters, feeLimit = 100000000, validateBalance = true) {
        // create tx to validate it's correct
        let tx = await this.tronWeb.transactionBuilder.triggerConstantContract(contractAddress, selector, { feeLimit }, parameters)
            .catch((err) => {
            throw new Error(`Tx validation error: ${err}`);
        });
        if (validateBalance) {
            // Check is sufficient resources for the fee
            const energyCost = await this.getEnergyCost();
            ;
            const accEnergy = await this.getAccountEnergy();
            const accBalance = Number(await this.getBalance());
            const neededForFee = tx.energy_used * energyCost;
            // TODO: take into account bandwidth consumption
            if ((accBalance + energyCost * accEnergy) < neededForFee) {
                throw new Error(`Insufficient balance for fee (available ${accBalance} sun + ${accEnergy} energy, needed at least ${neededForFee})`);
            }
            ;
        }
        // create actual tx with feeLimit field
        // it's a tronweb bug: triggerConstantContract doesn't include feeLimit in the transaction
        // so it can be reverted in case of out-of-energy
        tx = await this.tronWeb.transactionBuilder.triggerSmartContract(contractAddress, selector, { feeLimit }, parameters);
        // sign and send
        const signedTx = await this.tronWeb.trx.sign(tx.transaction);
        // do not retry sending here to avoid possible side effects
        try {
            const result = await this.tronWeb.trx.sendRawTransaction(signedTx);
            return result.txid;
        }
        catch (err) {
            throw new Error(`[SupportJS] Cannot send transaction: ${err.message}`);
        }
    }
}
exports.TronClient = TronClient;
//# sourceMappingURL=client.js.map