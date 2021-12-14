import Web3 from 'web3';
import { TransactionConfig } from 'web3-eth';
import { Contract } from 'web3-eth-contract';
import { AbiItem } from 'web3-utils';

import { Output, Proof } from '@/libzeropool-rs';
import { SnarkParams } from '@/config';
import { hexToBuf } from '@/utils';
import { ZeroPoolState } from '@/state';
import { Config } from './config';
import { TxType } from './private-tx';
import tokenAbi from './token-abi.json';
import { toCompactSignature } from './utils';

export interface RelayerInfo {
    root: string;
    deltaIndex: string;
}

export class RelayerAPI {
    private url: URL;

    constructor(url: URL) {
        this.url = url;
    }

    updateUrl(newUrl: URL) {
        this.url = newUrl;
    }

    async fetchTransactions(offset: BigInt, limit: number = 100): Promise<string[]> {
        const url = new URL('/transactions', this.url);
        url.searchParams.set('offset', offset.toString());
        url.searchParams.set('limit', limit.toString());

        const res = await (await fetch(url.toString())).json();

        return res;
    }

    async sendTransaction(proof: Proof, memo: string, txType: TxType, depositSignature?: string): Promise<void> {
        const url = new URL('/transaction', this.url);
        const res = await fetch(url.toString(), { method: 'POST', body: JSON.stringify({ proof, memo, txType, depositSignature }) });

        if (!res.ok) {
            const body = await res.json();
            throw new Error(`Error ${res.status}: ${JSON.stringify(body)}`)
        }
    }

    async info(): Promise<RelayerInfo> {
        const url = new URL('/info', this.url);
        const res = await fetch(url.toString());

        return await res.json();
    }
}

export class RelayerBackend {
    private zpState: ZeroPoolState;
    private worker: any;
    private relayer: RelayerAPI;
    private tokenContract: Contract;
    private config: Config;
    private web3: Web3;
    private snarkParams: SnarkParams;

    constructor(url: URL, web3: Web3, state: ZeroPoolState, snarkParams: SnarkParams, config: Config, worker: any) {
        this.zpState = state;
        this.worker = worker;
        this.web3 = web3;
        this.tokenContract = new this.web3.eth.Contract(tokenAbi as AbiItem[], config.tokenContractAddress) as Contract;
        this.relayer = new RelayerAPI(url);
        this.snarkParams = snarkParams;
        this.config = config;
    }

    public async mint(privateKey: string, amount: string): Promise<void> {
        const address = this.web3.eth.accounts.privateKeyToAccount(privateKey).address;
        const encodedTx = await this.tokenContract.methods.mint(address, BigInt(amount)).encodeABI();
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
        await this.web3.eth.sendSignedTransaction(signedTx.rawTransaction!);
    }

    public async getTokenBalance(address: string) {
        return this.tokenContract.methods.balanceOf(address).call();
    }

    // TODO: generalize wei/gwei
    public async deposit(privateKey: string, amountWei: string, fee: string = '0'): Promise<void> {
        const txType = TxType.Deposit;
        const amountGwei = (BigInt(amountWei) / this.zpState.denominator).toString();
        const txData = await this.zpState.account.createDeposit({ amount: amountGwei, fee });
        const txProof = await this.worker.proveTx(txData.public, txData.secret);
        const txValid = Proof.verify(this.snarkParams.transferVk!, txProof.inputs, txProof.proof);
        if (!txValid) {
            throw new Error('invalid tx proof');
        }

        const nullifier = '0x' + BigInt(txData.public.nullifier).toString(16).padStart(64, '0');
        const sign = await this.web3.eth.accounts.sign(nullifier, privateKey);
        const signature = toCompactSignature(sign.signature).slice(2);

        await this.approveAllowance(privateKey, amountWei);
        this.relayer.sendTransaction(txProof, txData.memo, txType, signature);
    }

    public async transfer(_privateKey: string, outsWei: Output[], fee: string = '0'): Promise<void> {
        const txType = TxType.Transfer;
        const outGwei = outsWei.map(({ to, amount }) => ({
            to,
            amount: (BigInt(amount) / this.zpState.denominator).toString(),
        }));

        const txData = await this.zpState.account.createTransfer({ outputs: outGwei, fee });
        const txProof = await this.worker.proveTx(txData.public, txData.secret);
        const txValid = Proof.verify(this.snarkParams.transferVk!, txProof.inputs, txProof.proof);
        if (!txValid) {
            throw new Error('invalid tx proof');
        }

        this.relayer.sendTransaction(txProof, txData.memo, txType);
    }

    public async withdraw(privateKey: string, amountWei: string, fee: string = '0'): Promise<void> {
        const txType = TxType.Withdraw;
        const address = this.web3.eth.accounts.privateKeyToAccount(privateKey).address;
        const addressBin = hexToBuf(address);

        const amountGwei = (BigInt(amountWei) / this.zpState.denominator).toString();
        const txData = await this.zpState.account.createWithdraw({ amount: amountGwei, to: addressBin, fee, native_amount: '0', energy_amount: '0' });
        const txProof = await this.worker.proveTx(txData.public, txData.secret);
        const txValid = Proof.verify(this.snarkParams.transferVk!, txProof.inputs, txProof.proof);
        if (!txValid) {
            throw new Error('invalid tx proof');
        }

        this.relayer.sendTransaction(txProof, txData.memo, txType);
    }

    private async approveAllowance(privateKey: string, amount: string): Promise<void> {
        const address = this.web3.eth.accounts.privateKeyToAccount(privateKey).address;
        // await this.tokenContract.methods.approve(this.config.contractAddress, BigInt(amount)).send({ from: address })

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

    public getTotalBalance(): string {
        return this.zpState.getTotalBalance();
    }

    /**
     * @returns [total, account, note]
     */
    public getBalances(): [string, string, string] {
        return this.zpState.getBalances();
    }

    public free(): void {
        this.zpState.free();
    }
}
