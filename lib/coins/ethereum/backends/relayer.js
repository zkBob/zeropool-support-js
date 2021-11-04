var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { Proof } from "libzeropool-rs-wasm-bundler";
import { hexToBuf, toTwosComplementHex } from "../../../utils";
import { ZeroPoolBackend } from "../../../zp/backend";
import { TxType, txTypeToString } from "../private-tx";
import tokenAbi from '../token-abi.json';
import { toCompactSignature } from "../utils";
export class RelayerAPI {
    constructor(url) {
        this.url = url;
    }
    fetchTransactions(offset, limit = 100) {
        return __awaiter(this, void 0, void 0, function* () {
            const url = new URL('/transactions', this.url);
            url.searchParams.set('offset', offset.toString());
            url.searchParams.set('limit', limit.toString());
            const res = yield (yield fetch(url.toString())).json();
            return res;
        });
    }
    sendTransaction(proof, memo, txType, withdrawSignature) {
        return __awaiter(this, void 0, void 0, function* () {
            const url = new URL('/transaction', this.url);
            const res = yield fetch(url.toString(), { method: 'POST', body: JSON.stringify({ proof, memo, txType, withdrawSignature }) });
            if (res.status !== 204) {
                const body = yield res.json();
                throw new Error(`Error ${res.status}: ${JSON.stringify(body)}`);
            }
        });
    }
    info() {
        return __awaiter(this, void 0, void 0, function* () {
            const url = new URL('/info', this.url);
            const res = yield fetch(url.toString());
            return yield res.json();
        });
    }
}
export class RelayerBackend extends ZeroPoolBackend {
    constructor(url, web3, state, snarkParams, config) {
        super(state);
        this.web3 = web3;
        this.tokenContract = new this.web3.eth.Contract(tokenAbi, config.tokenContractAddress);
        this.relayer = new RelayerAPI(url);
        this.zpState = state;
        this.snarkParams = snarkParams;
    }
    transfer(_privateKey, outsWei) {
        return __awaiter(this, void 0, void 0, function* () {
            const txType = TxType.Transfer;
            const memo = new Uint8Array(8); // FIXME: fee
            const outGwei = outsWei.map(({ to, amount }) => ({
                to,
                amount: (BigInt(amount) / this.zpState.denominator).toString(),
            }));
            const txData = yield this.zpState.privateAccount.createTx(txTypeToString(txType), outGwei, memo);
            const txProof = Proof.tx(this.snarkParams.transferParams, txData.public, txData.secret);
            this.relayer.sendTransaction(txProof, txData.memo, txType);
        });
    }
    deposit(privateKey, amountWei) {
        return __awaiter(this, void 0, void 0, function* () {
            const txType = TxType.Deposit;
            const memo = new Uint8Array(8); // FIXME: fee
            const outGwei = (BigInt(amountWei) / this.zpState.denominator).toString();
            const txData = yield this.zpState.privateAccount.createTx(txTypeToString(txType), outGwei, memo);
            const txProof = Proof.tx(this.snarkParams.transferParams, txData.public, txData.secret);
            const nullifier = '0x' + BigInt(txData.public.nullifier).toString(16).padStart(64, '0');
            const sign = yield this.web3.eth.accounts.sign(nullifier, privateKey);
            const signature = toCompactSignature(sign.signature).slice(2);
            yield this.approveAllowance(privateKey, amountWei);
            this.relayer.sendTransaction(txProof, txData.memo, txType, signature);
        });
    }
    withdraw(privateKey, amountWei) {
        return __awaiter(this, void 0, void 0, function* () {
            const txType = TxType.Withdraw;
            const address = this.web3.eth.accounts.privateKeyToAccount(privateKey).address;
            // FIXME: fee
            const memo = new Uint8Array(8 + 8 + 20); // fee + amount + address
            const amountBn = hexToBuf(toTwosComplementHex(BigInt(amountWei) / this.zpState.denominator, 8));
            memo.set(amountBn, 8);
            const addressBin = hexToBuf(address);
            memo.set(addressBin, 16);
            const outGwei = (BigInt(amountWei) / this.zpState.denominator).toString();
            const txData = yield this.zpState.privateAccount.createTx(txTypeToString(txType), outGwei, memo);
            const txProof = Proof.tx(this.snarkParams.transferParams, txData.public, txData.secret);
            this.relayer.sendTransaction(txProof, txData.memo, txType);
        });
    }
    approveAllowance(privateKey, amount) {
        return __awaiter(this, void 0, void 0, function* () {
            const address = this.web3.eth.accounts.privateKeyToAccount(privateKey).address;
            // await this.tokenContract.methods.approve(this.config.contractAddress, BigInt(amount)).send({ from: address })
            // await this.tokenContract.methods.mint(address, BigInt(amount)).send({ from: address });
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
}
//# sourceMappingURL=relayer.js.map