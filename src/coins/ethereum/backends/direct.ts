import Web3 from 'web3';
import { AbiItem } from 'web3-utils';
import { Contract } from 'web3-eth-contract';
import { TransactionConfig } from 'web3-core';

import { Output, TransactionData } from '@/libzeropool-rs';
import { ZeroPoolBackend } from '@/zp/backend';
import { ZeroPoolState } from '@/zp/state';
import { SnarkParams } from '@/config';
import { hexToBuf } from '@/utils';
import { Config } from '../config';
import { EthPrivateTransaction, TxType, txTypeToString } from '../private-tx';
import { toCompactSignature } from '../utils';
import tokenAbi from '../token-abi.json';

const DENOMINATOR = BigInt(1000000000);

export type TxDeposit = {
    txType: TxType.Deposit;
    signature: string;
    data: TransactionData;
};

export type TxTransfer = {
    txType: TxType.Transfer;
    data: TransactionData;
};

export type TxWithdraw = {
    txType: TxType.Withdraw;
    amount: string;
    data: TransactionData;
};

export type PrivateTx =
    TxDeposit |
    TxTransfer |
    TxWithdraw;


export class DirectBackend extends ZeroPoolBackend {
    private web3: Web3;
    private config: Config;
    private snarkParams: SnarkParams;
    private tokenContract: Contract;

    constructor(web3: Web3, snarkParams: SnarkParams, config: Config, state: ZeroPoolState) {
        super(state);

        this.web3 = web3;
        this.tokenContract = new this.web3.eth.Contract(tokenAbi as AbiItem[], config.tokenContractAddress) as Contract;
        this.snarkParams = snarkParams;
        this.zpState = state;
        this.config = config;
    }

    public async deposit(privateKey: string, amountWei: string, fee: string = '0'): Promise<void> {
        const amountGwei = (BigInt(amountWei) / DENOMINATOR).toString();
        const txData = await this.zpState.privateAccount.createDeposit({ amount: amountGwei, fee });
        const nullifier = '0x' + BigInt(txData.public.nullifier).toString(16).padStart(64, '0');
        const sign = await this.web3.eth.accounts.sign(nullifier, privateKey);
        const signature = toCompactSignature(sign.signature).slice(2);

        await this.approveAllowance(privateKey, amountWei);
        await this.signAndSendPrivateTx(privateKey, { txType: TxType.Deposit, data: txData, signature });
    }

    public async transfer(privateKey: string, outputs: Output[], fee: string = '0'): Promise<void> {
        const outputsGwei = outputs.map(out => ({
            to: out.to,
            amount: (BigInt(out.amount) / DENOMINATOR).toString(),
        }));
        const txData = await this.zpState.privateAccount.createTransfer({ outputs: outputsGwei, fee });
        await this.signAndSendPrivateTx(privateKey, { txType: TxType.Transfer, data: txData });
    }

    public async withdraw(privateKey: string, amount: string, fee: string = '0'): Promise<void> {
        const address = this.web3.eth.accounts.privateKeyToAccount(privateKey).address;
        const amountGwei = (BigInt(amount) / DENOMINATOR).toString();
        const addressBin = hexToBuf(address);

        const txData = await this.zpState.privateAccount.createWithdraw({ amount: amountGwei, to: addressBin, fee, native_amount: amount, energy_amount: '0' }); // FIXME: energy

        await this.signAndSendPrivateTx(privateKey, { txType: TxType.Withdraw, amount, data: txData });
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

    private async signAndSendPrivateTx(privateKey: string, privateTx: PrivateTx): Promise<void> {
        const address = this.web3.eth.accounts.privateKeyToAccount(privateKey).address;

        const tx = EthPrivateTransaction.fromData(privateTx.data, privateTx.txType, this.zpState.privateAccount, this.snarkParams, this.web3);
        const data = tx.encode();
        const txObject: TransactionConfig = {
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
        const result = await this.web3.eth.sendSignedTransaction(signed.rawTransaction!);

        console.log(txTypeToString(privateTx.txType), result);
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
