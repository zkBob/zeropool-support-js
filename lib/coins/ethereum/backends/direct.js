import { ZeroPoolBackend } from "../../../zp/backend";
import { hexToBuf } from "../../../utils";
import { EthPrivateTransaction, TxType, txTypeToString } from '../private-tx';
import { toCompactSignature } from '../utils';
import tokenAbi from '../token-abi.json';
const DENOMINATOR = BigInt(1000000000);
export class DirectBackend extends ZeroPoolBackend {
    constructor(web3, snarkParams, config, state) {
        super(state);
        this.tokenContract = new this.web3.eth.Contract(tokenAbi, config.tokenContractAddress);
        this.snarkParams = snarkParams;
        this.web3 = web3;
        this.zpState = state;
    }
    async deposit(privateKey, amountWei, fee = '0') {
        const amountGwei = (BigInt(amountWei) / DENOMINATOR).toString();
        const txData = await this.zpState.privateAccount.createDeposit({ amount: amountGwei, fee });
        const nullifier = '0x' + BigInt(txData.public.nullifier).toString(16).padStart(64, '0');
        const sign = await this.web3.eth.accounts.sign(nullifier, privateKey);
        const signature = toCompactSignature(sign.signature).slice(2);
        await this.approveAllowance(privateKey, amountWei);
        await this.signAndSendPrivateTx(privateKey, { txType: TxType.Deposit, data: txData, signature });
    }
    async transfer(privateKey, outputs, fee = '0') {
        const txData = await this.zpState.privateAccount.createTransfer({ outputs, fee });
        await this.signAndSendPrivateTx(privateKey, { txType: TxType.Transfer, data: txData });
    }
    async withdraw(privateKey, amount, fee = '0') {
        const address = this.web3.eth.accounts.privateKeyToAccount(privateKey).address;
        const amountGwei = (BigInt(amount) / DENOMINATOR).toString();
        const addressBin = hexToBuf(address);
        const txData = await this.zpState.privateAccount.createWithdraw({ amount: amountGwei, to: addressBin, fee, native_amount: amount, energy_amount: '0' }); // FIXME: energy
        await this.signAndSendPrivateTx(privateKey, { txType: TxType.Withdraw, amount, data: txData });
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
        const tx = EthPrivateTransaction.fromData(privateTx.data, privateTx.txType, this.zpState.privateAccount, this.snarkParams, this.web3);
        const data = tx.encode();
        const txObject = {
            from: address,
            to: this.config.contractAddress,
            data,
        };
        switch (privateTx.txType) {
            case TxType.Deposit:
                txObject.data += privateTx.signature;
                break;
            case TxType.Withdraw:
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
        console.log(txTypeToString(privateTx.txType), result);
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
//# sourceMappingURL=direct.js.map