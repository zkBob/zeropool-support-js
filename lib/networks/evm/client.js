"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EthereumClient = void 0;
const web3_1 = __importDefault(require("web3"));
const web3_utils_1 = require("web3-utils");
const token_abi_json_1 = __importDefault(require("./abi/token-abi.json"));
const minter_abi_json_1 = __importDefault(require("./abi/minter-abi.json"));
const pool_abi_json_1 = __importDefault(require("./abi/pool-abi.json"));
const dd_abi_json_1 = __importDefault(require("./abi/dd-abi.json"));
const client_1 = require("../../networks/client");
const promise_retry_1 = __importDefault(require("promise-retry"));
const bs58 = require('bs58');
const RETRY_COUNT = 5;
class EthereumClient extends client_1.Client {
    constructor(provider, config = { transactionUrl: '{{hash}}' }) {
        super();
        this.ddContractAddresses = new Map(); // poolContractAddress -> directDepositContractAddress
        this.tokenDecimals = new Map(); // tokenAddress -> decimals
        this.gasMultiplier = 1.0;
        this.provider = provider;
        this.web3 = new web3_1.default(provider);
        this.token = new this.web3.eth.Contract(token_abi_json_1.default);
        this.minter = new this.web3.eth.Contract(minter_abi_json_1.default);
        this.pool = new this.web3.eth.Contract(pool_abi_json_1.default);
        this.dd = new this.web3.eth.Contract(dd_abi_json_1.default);
        this.transactionUrl = config.transactionUrl;
    }
    haltClient() {
        if (this.provider) {
            this.provider.engine.stop();
            delete this.provider;
        }
    }
    contractCallRetry(contract, address, method, args = []) {
        return this.commonRpcRetry(async () => {
            contract.options.address = address;
            return await contract.methods[method](...args).call();
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
    // ------------------=========< Getting common data >=========-------------------
    // | ChainID, token name, token decimals                                        |
    // ------------------------------------------------------------------------------
    async getChainId() {
        return this.commonRpcRetry(async () => {
            return this.web3.eth.net.getId();
        }, '[SupportJS] Cannot get chain ID', RETRY_COUNT);
    }
    async getBlockNumber() {
        return this.commonRpcRetry(async () => {
            return this.web3.eth.getBlockNumber();
        }, '[SupportJS] Cannot get block number', RETRY_COUNT);
    }
    async getTokenName(tokenAddress) {
        return this.contractCallRetry(this.token, tokenAddress, 'name');
    }
    async decimals(tokenAddress) {
        let res = this.tokenDecimals.get(tokenAddress);
        if (!res) {
            try {
                this.token.options.address = tokenAddress;
                res = Number(await await this.contractCallRetry(this.token, tokenAddress, 'decimals'));
                this.tokenDecimals.set(tokenAddress, res);
            }
            catch (err) {
                throw new Error(`[SupportJS] Cannot fetch decimals for the token ${tokenAddress}: ${err.message}`);
            }
        }
        return res;
    }
    // ------------------=========< Conversion routines >=========-------------------
    // | Between base units and human-readable                                      |
    // ------------------------------------------------------------------------------
    baseUnit() {
        return 'wei';
    }
    toBaseUnit(humanAmount) {
        return BigInt(this.web3.utils.toWei(humanAmount, 'ether'));
    }
    fromBaseUnit(baseAmount) {
        return this.web3.utils.fromWei(String(baseAmount), 'ether');
    }
    async toBaseTokenUnit(tokenAddress, humanAmount) {
        const decimals = BigInt(await this.decimals(tokenAddress));
        const wei = BigInt(this.toBaseUnit(humanAmount));
        const baseDecimals = 18n;
        const baseUnits = (decimals <= baseDecimals) ?
            wei / (10n ** (baseDecimals - decimals)) :
            wei * (10n ** (decimals - baseDecimals));
        return baseUnits;
    }
    async fromBaseTokenUnit(tokenAddress, baseAmount) {
        const decimals = BigInt(await this.decimals(tokenAddress));
        const baseDecimals = 18n;
        const wei = (decimals <= baseDecimals) ?
            baseAmount * (10n ** (baseDecimals - decimals)) :
            baseAmount / (10n ** (decimals - baseDecimals));
        return this.fromBaseUnit(wei);
    }
    validateAddress(address) {
        return (0, web3_utils_1.isAddress)(address);
    }
    // ----------------=========< Fetching address info >=========-------------------
    // | Native&token balances, nonces, etc                                         |
    // ------------------------------------------------------------------------------
    async getAddress() {
        return (await this.web3.eth.getAccounts())[0];
    }
    async getBalance() {
        const res = await this.commonRpcRetry(async () => {
            return Number(await this.web3.eth.getBalance(await this.getAddress()));
        }, '[SupportJS] Unable to retrieve user balance', RETRY_COUNT);
        return BigInt(res);
    }
    async getTokenBalance(tokenAddress) {
        const address = await this.getAddress();
        const balance = await this.contractCallRetry(this.token, tokenAddress, 'balanceOf', [address]);
        return BigInt(balance);
    }
    async getTokenNonce(tokenAddress) {
        const address = await this.getAddress();
        const nonce = await this.contractCallRetry(this.token, tokenAddress, 'nonces', [address]);
        return Number(nonce);
    }
    async allowance(tokenAddress, spender) {
        const owner = await this.getAddress();
        const nonce = await this.contractCallRetry(this.token, tokenAddress, 'allowance', [owner, spender]);
        return BigInt(nonce);
    }
    // ------------=========< Active blockchain interaction >=========---------------
    // | All actions related to the transaction sending                             |
    // ------------------------------------------------------------------------------
    async estimateTxFee(txObject) {
        const address = await this.getAddress();
        const gas = await this.commonRpcRetry(async () => {
            return Number(await this.web3.eth.estimateGas(txObject ?? { from: address, to: address, value: '1' }));
        }, '[SupportJS] Unable to estimate gas', RETRY_COUNT);
        const gasPrice = await this.commonRpcRetry(async () => {
            return Number(await this.web3.eth.getGasPrice());
        }, '[SupportJS] Unable to get gas price', RETRY_COUNT);
        const fee = gas * gasPrice;
        return {
            gas: BigInt(gas),
            gasPrice: BigInt(Math.ceil(gasPrice * this.gasMultiplier)),
            fee: this.web3.utils.fromWei(fee.toString(10), 'ether'),
        };
    }
    async getNativeNonce() {
        const address = await this.getAddress();
        return this.commonRpcRetry(async () => {
            return Number(await this.web3.eth.getTransactionCount(address));
        }, '[SupportJS] Cannot get native nonce', RETRY_COUNT);
    }
    async signAndSendTx(txObject) {
        try {
            const txFee = await this.estimateTxFee(txObject);
            const nonce = await this.getNativeNonce();
            txObject.gas = Number(txFee.gas);
            txObject.gasPrice = `0x${txFee.gasPrice.toString(16)}`;
            txObject.nonce = nonce;
            const signedTx = await this.web3.eth.signTransaction(txObject);
            return this.web3.eth.sendSignedTransaction(signedTx.raw);
        }
        catch (err) {
            throw new Error(`[SupportJS] Cannot send transaction: ${err.message}`);
        }
    }
    async sendTransaction(to, amount, data) {
        const address = await this.getAddress();
        var txObject = {
            from: address,
            to,
            value: amount.toString(),
            data,
        };
        const receipt = await this.signAndSendTx(txObject);
        return receipt.transactionHash;
    }
    async transfer(to, amount) {
        const txObject = {
            from: await this.getAddress(),
            to,
            value: amount.toString(),
        };
        const receipt = await this.signAndSendTx(txObject);
        return receipt.transactionHash;
    }
    async transferToken(tokenAddress, to, amount) {
        const address = await this.getAddress();
        const encodedTx = await this.token.methods.transfer(to, BigInt(amount)).encodeABI();
        var txObject = {
            from: address,
            to: tokenAddress,
            data: encodedTx,
        };
        const receipt = await this.signAndSendTx(txObject);
        return receipt.transactionHash;
    }
    async approve(tokenAddress, spender, amount) {
        const address = await this.getAddress();
        const encodedTx = await this.token.methods.approve(spender, amount).encodeABI();
        var txObject = {
            from: address,
            to: tokenAddress,
            data: encodedTx,
        };
        const receipt = await this.signAndSendTx(txObject);
        return receipt.transactionHash;
    }
    async increaseAllowance(tokenAddress, spender, additionalAmount) {
        const address = await this.getAddress();
        const encodedTx = await this.token.methods.increaseAllowance(spender, BigInt(additionalAmount)).encodeABI();
        var txObject = {
            from: address,
            to: tokenAddress,
            data: encodedTx,
        };
        const receipt = await this.signAndSendTx(txObject);
        return receipt.transactionHash;
    }
    async mint(minterAddress, amount) {
        const address = await this.getAddress();
        const encodedTx = await this.token.methods.mint(address, amount).encodeABI();
        var txObject = {
            from: address,
            to: minterAddress,
            data: encodedTx,
        };
        const receipt = await this.signAndSendTx(txObject);
        return receipt.transactionHash;
    }
    // ------------------=========< Signing routines >=========----------------------
    // | Signing data and typed data                                                |
    // ------------------------------------------------------------------------------
    async sign(data) {
        const address = await this.getAddress();
        const signature = await this.web3.eth.sign(data, address);
        return signature;
    }
    async signTypedData(data) {
        const address = await this.getAddress();
        const provider = this.web3.currentProvider;
        const signPromise = new Promise((resolve, reject) => {
            if (typeof provider != 'string' && typeof provider?.send != 'undefined') {
                provider.send({ method: 'eth_signTypedData_v4', params: [JSON.stringify(data), address.toLowerCase()], jsonrpc: '2.0' }, function (error, result) {
                    if (error) {
                        reject(error);
                    }
                    if (result?.result) {
                        resolve(result.result);
                    }
                    else {
                        reject('Unable to sign: ' + result?.error);
                    }
                });
            }
            else {
                reject(Error('Incorrect provider'));
            }
        });
        return signPromise;
    }
    // -----------------=========< High-level routines >=========--------------------
    // | Direct deposits routines                                                   |
    // ------------------------------------------------------------------------------
    async getDirectDepositContract(poolAddress) {
        let ddContractAddr = this.ddContractAddresses.get(poolAddress);
        if (!ddContractAddr) {
            this.pool.options.address = poolAddress;
            ddContractAddr = await this.contractCallRetry(this.pool, poolAddress, 'direct_deposit_queue');
            if (ddContractAddr) {
                this.ddContractAddresses.set(poolAddress, ddContractAddr);
            }
            else {
                throw new Error(`Cannot fetch DD contract address`);
            }
        }
        return ddContractAddr;
    }
    async directDeposit(poolAddress, amount, zkAddress) {
        let ddContractAddr = await this.getDirectDepositContract(poolAddress);
        const address = await this.getAddress();
        const zkAddrBytes = `0x${Buffer.from(bs58.decode(zkAddress.substring(zkAddress.indexOf(':') + 1))).toString('hex')}`;
        const encodedTx = await this.dd.methods["directDeposit(address,uint256,bytes)"](address, amount, zkAddrBytes).encodeABI();
        var txObject = {
            from: address,
            to: ddContractAddr,
            data: encodedTx,
        };
        const receipt = await this.signAndSendTx(txObject);
        return receipt.transactionHash;
    }
}
exports.EthereumClient = EthereumClient;
//# sourceMappingURL=client.js.map