var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { ZeroPoolBackend } from "../../../zp/backend";
import { EthPrivateTransaction, TxType, txTypeToString } from "../private-tx";
import { hexToBuf, toTwosComplementHex } from "../../../utils";
import { toCompactSignature } from "../utils";
import tokenAbi from '../token-abi.json';
const STATE_STORAGE_PREFIX = 'zeropool.eth.state';
const DENOMINATOR = BigInt(1000000000);
export class DirectBackend extends ZeroPoolBackend {
    constructor(web3, snarkParams, config, state) {
        super(state);
        this.tokenContract = new this.web3.eth.Contract(tokenAbi, config.tokenContractAddress);
        this.snarkParams = snarkParams;
        this.web3 = web3;
        this.zpState = state;
    }
    transfer(privateKey, outs) {
        return __awaiter(this, void 0, void 0, function* () {
            const memo = new Uint8Array(8); // FIXME: fee
            yield this.signAndSendPrivateTx(privateKey, TxType.Transfer, outs, memo);
        });
    }
    deposit(privateKey, amount) {
        return __awaiter(this, void 0, void 0, function* () {
            const memo = new Uint8Array(8); // FIXME: fee
            yield this.approveAllowance(privateKey, amount);
            yield this.signAndSendPrivateTx(privateKey, TxType.Deposit, amount, memo);
        });
    }
    approveAllowance(privateKey, amount) {
        return __awaiter(this, void 0, void 0, function* () {
            const address = this.web3.eth.accounts.privateKeyToAccount(privateKey).address;
            // await this.tokenContract.methods.approve(this.config.contractAddress, BigInt(amount)).send({ from: address })
            yield this.tokenContract.methods.mint(address, BigInt(amount)).send({ from: address });
            const encodedTx = this.tokenContract.methods.approve(this.config.contractAddress, BigInt(amount)).encodeABI();
            var txObject = {
                from: address,
                to: this.config.tokenContractAddress,
                data: encodedTx,
            };
            const gas = yield this.web3.eth.estimateGas(txObject);
            const gasPrice = BigInt(yield this.web3.eth.getGasPrice());
            const nonce = yield this.web3.eth.getTransactionCount(address);
            txObject.gas = gas;
            txObject.gasPrice = `0x${gasPrice.toString(16)}`;
            txObject.nonce = nonce;
            const signedTx = yield this.web3.eth.accounts.signTransaction(txObject, privateKey);
            const result = yield this.web3.eth.sendSignedTransaction(signedTx.rawTransaction);
            console.log('approve', result);
        });
    }
    withdraw(privateKey, amount) {
        return __awaiter(this, void 0, void 0, function* () {
            const address = this.web3.eth.accounts.privateKeyToAccount(privateKey).address;
            const memo = new Uint8Array(8 + 8 + 20); // fee + amount + address
            const amountBn = hexToBuf(toTwosComplementHex(BigInt(amount) / this.zpState.denominator, 8));
            memo.set(amountBn, 8);
            const addressBin = hexToBuf(address);
            memo.set(addressBin, 16);
            yield this.signAndSendPrivateTx(privateKey, TxType.Withdraw, amount, memo);
        });
    }
    signAndSendPrivateTx(privateKey, txType, outWei, memo) {
        return __awaiter(this, void 0, void 0, function* () {
            const address = this.web3.eth.accounts.privateKeyToAccount(privateKey).address;
            let outGwei;
            if (typeof outWei === 'string') {
                outGwei = (BigInt(outWei) / this.zpState.denominator).toString();
            }
            else {
                outGwei = outWei.map(({ to, amount }) => ({
                    to,
                    amount: (BigInt(amount) / this.zpState.denominator).toString(),
                }));
            }
            const txData = yield this.zpState.privateAccount.createTx(txTypeToString(txType), outGwei, memo);
            const tx = EthPrivateTransaction.fromData(txData, txType, this.zpState.privateAccount, this.snarkParams, this.web3);
            const data = tx.encode();
            const txObject = {
                from: address,
                to: this.config.contractAddress,
                data,
            };
            if (txType === TxType.Deposit) {
                const nullifier = '0x' + BigInt(txData.public.nullifier).toString(16).padStart(64, '0');
                const sign = yield this.web3.eth.accounts.sign(nullifier, privateKey);
                const signature = toCompactSignature(sign.signature).slice(2);
                txObject.data += signature;
            }
            else if (txType === TxType.Withdraw && typeof outWei === 'string') {
                txObject.value = outWei;
            }
            const gas = yield this.web3.eth.estimateGas(txObject);
            const gasPrice = BigInt(yield this.web3.eth.getGasPrice());
            const nonce = yield this.web3.eth.getTransactionCount(address);
            txObject.gas = gas * 2;
            txObject.gasPrice = `0x${gasPrice.toString(16)}`;
            txObject.nonce = nonce;
            const signed = yield this.web3.eth.accounts.signTransaction(txObject, privateKey);
            const result = yield this.web3.eth.sendSignedTransaction(signed.rawTransaction);
            console.log(txTypeToString(txType), result);
        });
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