"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RelayerBackend = exports.RelayerAPI = void 0;
const libzeropool_rs_wasm_web_1 = require("libzeropool-rs-wasm-web");
const libzeropool_rs_1 = require("../../libzeropool-rs");
const utils_1 = require("../../utils");
const private_tx_1 = require("./private-tx");
const token_abi_json_1 = __importDefault(require("./token-abi.json"));
const utils_2 = require("./utils");
class RelayerAPI {
    constructor(url) {
        this.url = url;
    }
    updateUrl(newUrl) {
        this.url = newUrl;
    }
    async fetchTransactions(offset, limit = 100) {
        const url = new URL('/transactions', this.url);
        url.searchParams.set('offset', offset.toString());
        url.searchParams.set('limit', limit.toString());
        const res = await (await fetch(url.toString())).json();
        return res;
    }
    async sendTransaction(proof, memo, txType, depositSignature) {
        const url = new URL('/transaction', this.url);
        const res = await fetch(url.toString(), { method: 'POST', body: JSON.stringify({ proof, memo, txType, depositSignature }) });
        if (!res.ok) {
            const body = await res.json();
            throw new Error(`Error ${res.status}: ${JSON.stringify(body)}`);
        }
        const json = await res.json();
        const INTERVAL_MS = 1000;
        let hash;
        while (true) {
            const job = await this.getJob(json.jobId);
            if (job === null) {
                console.error(`Job ${json.jobId} not found.`);
                throw new Error('Job not found');
            }
            else if (job.state === 'failed') {
                throw new Error('Transaction failed');
            }
            else if (job.state = 'completed') {
                hash = job.txHash;
                break;
            }
            await new Promise(resolve => setTimeout(resolve, INTERVAL_MS));
        }
        console.info(`Transaction successful: ${hash}`);
        return hash;
    }
    async getJob(id) {
        const url = new URL(`/job/${id}`, this.url);
        const res = await (await fetch(url.toString())).json();
        if (typeof res === 'string') {
            return null;
        }
        else {
            return res;
        }
    }
    async info() {
        const url = new URL('/info', this.url);
        const res = await fetch(url.toString());
        return await res.json();
    }
}
exports.RelayerAPI = RelayerAPI;
class RelayerBackend {
    constructor(url, web3, state, snarkParams, config, worker) {
        this.zpState = state;
        this.worker = worker;
        this.web3 = web3;
        this.tokenContract = new this.web3.eth.Contract(token_abi_json_1.default, config.tokenContractAddress);
        this.relayer = new RelayerAPI(url);
        this.snarkParams = snarkParams;
        this.config = config;
    }
    async mint(privateKey, amount) {
        const address = this.web3.eth.accounts.privateKeyToAccount(privateKey).address;
        const encodedTx = await this.tokenContract.methods.mint(address, BigInt(amount)).encodeABI();
        var txObject = {
            from: address,
            to: this.config.tokenContractAddress,
            data: encodedTx,
        };
        const gas = await this.web3.eth.estimateGas(txObject);
        const gasPrice = BigInt(await this.web3.eth.getGasPrice());
        const nonce = await this.web3.eth.getTransactionCount(address);
        txObject.gas = gas;
        txObject.gasPrice = `0x${gasPrice.toString(16)}`;
        txObject.nonce = nonce;
        const signedTx = await this.web3.eth.accounts.signTransaction(txObject, privateKey);
        await this.web3.eth.sendSignedTransaction(signedTx.rawTransaction);
    }
    async getTokenBalance(address) {
        return this.tokenContract.methods.balanceOf(address).call();
    }
    // TODO: generalize wei/gwei
    async deposit(privateKey, amountWei, fee = '0') {
        const address = this.web3.eth.accounts.privateKeyToAccount(privateKey).address;
        const tokenBalance = await this.getTokenBalance(address);
        if (amountWei > tokenBalance) {
            throw new Error(`Insufficient balance for deposit. Current balance: ${tokenBalance}`);
        }
        const txType = private_tx_1.TxType.Deposit;
        const amountGwei = (BigInt(amountWei) / this.zpState.denominator).toString();
        const txData = await this.zpState.account.createDeposit({ amount: amountGwei, fee });
        const txProof = await this.worker.proveTx(txData.public, txData.secret);
        const txValid = libzeropool_rs_1.Proof.verify(this.snarkParams.transferVk, txProof.inputs, txProof.proof);
        if (!txValid) {
            throw new Error('invalid tx proof');
        }
        const nullifier = '0x' + BigInt(txData.public.nullifier).toString(16).padStart(64, '0');
        const sign = await this.web3.eth.accounts.sign(nullifier, privateKey);
        const signature = (0, utils_2.toCompactSignature)(sign.signature).slice(2);
        await this.approveAllowance(privateKey, amountWei);
        await this.relayer.sendTransaction(txProof, txData.memo, txType, signature);
    }
    async transfer(_privateKey, outsWei, fee = '0') {
        const txType = private_tx_1.TxType.Transfer;
        const outGwei = outsWei.map(({ to, amount }) => {
            if (!(0, libzeropool_rs_wasm_web_1.validateAddress)(to)) {
                throw new Error('Invalid address. Expected a shielded address.');
            }
            return {
                to,
                amount: (BigInt(amount) / this.zpState.denominator).toString(),
            };
        });
        const txData = await this.zpState.account.createTransfer({ outputs: outGwei, fee });
        const txProof = await this.worker.proveTx(txData.public, txData.secret);
        const txValid = libzeropool_rs_1.Proof.verify(this.snarkParams.transferVk, txProof.inputs, txProof.proof);
        if (!txValid) {
            throw new Error('invalid tx proof');
        }
        await this.relayer.sendTransaction(txProof, txData.memo, txType);
    }
    async withdraw(privateKey, amountWei, fee = '0') {
        const txType = private_tx_1.TxType.Withdraw;
        const address = this.web3.eth.accounts.privateKeyToAccount(privateKey).address;
        const addressBin = (0, utils_1.hexToBuf)(address);
        const amountGwei = (BigInt(amountWei) / this.zpState.denominator).toString();
        const txData = await this.zpState.account.createWithdraw({ amount: amountGwei, to: addressBin, fee, native_amount: '0', energy_amount: '0' });
        const txProof = await this.worker.proveTx(txData.public, txData.secret);
        const txValid = libzeropool_rs_1.Proof.verify(this.snarkParams.transferVk, txProof.inputs, txProof.proof);
        if (!txValid) {
            throw new Error('invalid tx proof');
        }
        await this.relayer.sendTransaction(txProof, txData.memo, txType);
    }
    async approveAllowance(privateKey, amount) {
        const address = this.web3.eth.accounts.privateKeyToAccount(privateKey).address;
        const curAllowance = await this.tokenContract.methods.allowance(address, this.config.contractAddress).call();
        if (amount <= curAllowance) {
            console.log(`No need to approve allowance. Current: ${curAllowance}, needed: ${amount}.`);
            return;
        }
        else {
            console.log(`Approving allowance. Current: ${curAllowance}, needed: ${amount}.`);
            amount = (BigInt(amount) - BigInt(curAllowance)).toString();
        }
        const encodedTx = this.tokenContract.methods.approve(this.config.contractAddress, BigInt(amount)).encodeABI();
        var txObject = {
            from: address,
            to: this.config.tokenContractAddress,
            data: encodedTx,
        };
        const gas = await this.web3.eth.estimateGas(txObject);
        const gasPrice = BigInt(await this.web3.eth.getGasPrice());
        const nonce = await this.web3.eth.getTransactionCount(address);
        txObject.gas = gas;
        txObject.gasPrice = `0x${gasPrice.toString(16)}`;
        txObject.nonce = nonce;
        const signedTx = await this.web3.eth.accounts.signTransaction(txObject, privateKey);
        await this.web3.eth.sendSignedTransaction(signedTx.rawTransaction);
    }
    getTotalBalance() {
        return this.zpState.getTotalBalance();
    }
    /**
     * @returns [total, account, note]
     */
    getBalances() {
        return this.zpState.getBalances();
    }
    free() {
        this.zpState.free();
    }
}
exports.RelayerBackend = RelayerBackend;
//# sourceMappingURL=relayer.js.map