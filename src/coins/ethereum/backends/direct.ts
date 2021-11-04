import { Note, Output } from "libzeropool-rs-wasm-bundler";
import Web3 from "web3";
import { TransactionConfig } from "web3-core";
import { Contract } from "web3-eth-contract";
import { Config } from "../config";
import { ZeroPoolBackend } from "../../../zp/backend";
import { ZeroPoolState } from "../../../zp/state";
import { EthPrivateTransaction, TxType, txTypeToString } from "../private-tx";
import { SnarkParams } from "../../../config";
import { hexToBuf, toTwosComplementHex } from "../../../utils";
import { toCompactSignature } from "../utils";
import tokenAbi from '../token-abi.json';
import { AbiItem } from "web3-utils";

const STATE_STORAGE_PREFIX = 'zeropool.eth.state';
const DENOMINATOR = BigInt(1000000000);

export class DirectBackend extends ZeroPoolBackend {
    private web3: Web3;
    private config: Config;
    private snarkParams: SnarkParams;
    private tokenContract: Contract;

    constructor(web3: Web3, snarkParams: SnarkParams, config: Config, state: ZeroPoolState) {
        super(state);

        this.tokenContract = new this.web3.eth.Contract(tokenAbi as AbiItem[], config.tokenContractAddress) as Contract;
        this.snarkParams = snarkParams;
        this.web3 = web3;
        this.zpState = state;
    }

    public async transfer(privateKey: string, outs: Output[]): Promise<void> {
        const memo = new Uint8Array(8); // FIXME: fee
        await this.signAndSendPrivateTx(privateKey, TxType.Transfer, outs, memo);
    }

    public async deposit(privateKey: string, amount: string): Promise<void> {
        const memo = new Uint8Array(8); // FIXME: fee

        await this.approveAllowance(privateKey, amount);
        await this.signAndSendPrivateTx(privateKey, TxType.Deposit, amount, memo);
    }

    private async approveAllowance(privateKey: string, amount: string): Promise<void> {
        const address = this.web3.eth.accounts.privateKeyToAccount(privateKey).address;
        // await this.tokenContract.methods.approve(this.config.contractAddress, BigInt(amount)).send({ from: address })

        await this.tokenContract.methods.mint(address, BigInt(amount)).send({ from: address });
        const encodedTx = this.tokenContract.methods.approve(this.config.contractAddress, BigInt(amount)).encodeABI();
        var txObject: TransactionConfig = {
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
        const result = await this.web3.eth.sendSignedTransaction(signedTx.rawTransaction!);

        console.log('approve', result);
    }

    public async withdraw(privateKey: string, amount: string): Promise<void> {
        const address = this.web3.eth.accounts.privateKeyToAccount(privateKey).address;

        const memo = new Uint8Array(8 + 8 + 20); // fee + amount + address
        const amountBn = hexToBuf(toTwosComplementHex(BigInt(amount) / this.zpState.denominator, 8));
        memo.set(amountBn, 8);
        const addressBin = hexToBuf(address);
        memo.set(addressBin, 16);

        await this.signAndSendPrivateTx(privateKey, TxType.Withdraw, amount, memo);
    }

    private async signAndSendPrivateTx(privateKey: string, txType: TxType, outWei: string | Output[], memo: Uint8Array): Promise<void> {
        const address = this.web3.eth.accounts.privateKeyToAccount(privateKey).address;

        let outGwei;
        if (typeof outWei === 'string') {
            outGwei = (BigInt(outWei) / this.zpState.denominator).toString();
        } else {
            outGwei = outWei.map(({ to, amount }) => ({
                to,
                amount: (BigInt(amount) / this.zpState.denominator).toString(),
            }));
        }

        const txData = await this.zpState.privateAccount.createTx(txTypeToString(txType), outGwei, memo);
        const tx = EthPrivateTransaction.fromData(txData, txType, this.zpState.privateAccount, this.snarkParams, this.web3);
        const data = tx.encode();
        const txObject: TransactionConfig = {
            from: address,
            to: this.config.contractAddress,
            data,
        };

        if (txType === TxType.Deposit) {
            const nullifier = '0x' + BigInt(txData.public.nullifier).toString(16).padStart(64, '0');
            const sign = await this.web3.eth.accounts.sign(nullifier, privateKey);
            const signature = toCompactSignature(sign.signature).slice(2);
            txObject.data += signature;
        } else if (txType === TxType.Withdraw && typeof outWei === 'string') {
            txObject.value = outWei;
        }

        const gas = await this.web3.eth.estimateGas(txObject);
        const gasPrice = BigInt(await this.web3.eth.getGasPrice());
        const nonce = await this.web3.eth.getTransactionCount(address);
        txObject.gas = gas * 2;
        txObject.gasPrice = `0x${gasPrice.toString(16)}`;
        txObject.nonce = nonce;

        const signed = await this.web3.eth.accounts.signTransaction(txObject, privateKey);
        const result = await this.web3.eth.sendSignedTransaction(signed.rawTransaction!);

        console.log(txTypeToString(txType), result);
    }

    public getTotalBalance(): string {
        return this.zpState.getTotalBalance();
    }

    /**
     * @returns [total, account, note]
     */
    public getBalances(): [string, string, string] {
        return this.zpState.getBalances();
    }
}
