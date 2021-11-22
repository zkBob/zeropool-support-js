"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DirectBackend = void 0;
const backend_1 = require("../../../zp/backend");
const utils_1 = require("../../../utils");
const private_tx_1 = require("../private-tx");
const utils_2 = require("../utils");
const token_abi_json_1 = __importDefault(require("../token-abi.json"));
const DENOMINATOR = BigInt(1000000000);
class DirectBackend extends backend_1.ZeroPoolBackend {
    constructor(web3, snarkParams, config, state) {
        super(state);
        this.web3 = web3;
        this.tokenContract = new this.web3.eth.Contract(token_abi_json_1.default, config.tokenContractAddress);
        this.snarkParams = snarkParams;
        this.zpState = state;
        this.config = config;
    }
    async deposit(privateKey, amountWei, fee = '0') {
        const amountGwei = (BigInt(amountWei) / DENOMINATOR).toString();
        const txData = await this.zpState.privateAccount.createDeposit({ amount: amountGwei, fee });
        const nullifier = '0x' + BigInt(txData.public.nullifier).toString(16).padStart(64, '0');
        const sign = await this.web3.eth.accounts.sign(nullifier, privateKey);
        const signature = (0, utils_2.toCompactSignature)(sign.signature).slice(2);
        await this.approveAllowance(privateKey, amountWei);
        await this.signAndSendPrivateTx(privateKey, { txType: private_tx_1.TxType.Deposit, data: txData, signature });
    }
    async transfer(privateKey, outputs, fee = '0') {
        const outputsWei = outputs.map(out => ({
            to: out.to,
            amount: (BigInt(out.amount) / DENOMINATOR).toString(),
        }));
        const txData = await this.zpState.privateAccount.createTransfer({ outputs: outputsWei, fee });
        await this.signAndSendPrivateTx(privateKey, { txType: private_tx_1.TxType.Transfer, data: txData });
    }
    async withdraw(privateKey, amount, fee = '0') {
        const address = this.web3.eth.accounts.privateKeyToAccount(privateKey).address;
        const amountGwei = (BigInt(amount) / DENOMINATOR).toString();
        const addressBin = (0, utils_1.hexToBuf)(address);
        const txData = await this.zpState.privateAccount.createWithdraw({ amount: amountGwei, to: addressBin, fee, native_amount: amount, energy_amount: '0' }); // FIXME: energy
        await this.signAndSendPrivateTx(privateKey, { txType: private_tx_1.TxType.Withdraw, amount, data: txData });
    }
    async approveAllowance(privateKey, amount) {
        const address = this.web3.eth.accounts.privateKeyToAccount(privateKey).address;
        // await this.tokenContract.methods.approve(this.config.contractAddress, BigInt(amount)).send({ from: address })
        await this.tokenContract.methods.mint(address, BigInt(amount)).send({ from: address });
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
        const result = await this.web3.eth.sendSignedTransaction(signedTx.rawTransaction);
        console.log('approve', result);
    }
    async signAndSendPrivateTx(privateKey, privateTx) {
        const address = this.web3.eth.accounts.privateKeyToAccount(privateKey).address;
        const tx = private_tx_1.EthPrivateTransaction.fromData(privateTx.data, privateTx.txType, this.zpState.privateAccount, this.snarkParams, this.web3);
        const data = tx.encode();
        const txObject = {
            from: address,
            to: this.config.contractAddress,
            data,
        };
        switch (privateTx.txType) {
            case private_tx_1.TxType.Deposit:
                txObject.data += privateTx.signature;
                break;
            case private_tx_1.TxType.Withdraw:
                txObject.value = privateTx.amount;
                break;
        }
        const gas = await this.web3.eth.estimateGas(txObject);
        const gasPrice = BigInt(await this.web3.eth.getGasPrice());
        const nonce = await this.web3.eth.getTransactionCount(address);
        txObject.gas = gas * 2;
        txObject.gasPrice = `0x${gasPrice.toString(16)}`;
        txObject.nonce = nonce;
        const signed = await this.web3.eth.accounts.signTransaction(txObject, privateKey);
        const result = await this.web3.eth.sendSignedTransaction(signed.rawTransaction);
        console.log((0, private_tx_1.txTypeToString)(privateTx.txType), result);
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
}
exports.DirectBackend = DirectBackend;
//# sourceMappingURL=direct.js.map