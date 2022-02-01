import Web3 from 'web3';
import { TransactionConfig } from 'web3-eth';
import { Contract } from 'web3-eth-contract';
import { AbiItem, keccak256 } from 'web3-utils';
import { assembleAddress, Note, validateAddress } from 'libzeropool-rs-wasm-web';

import { Output, Proof } from '@/libzeropool-rs';
import { SnarkParams, Tokens } from '@/config';
import { hexToBuf } from '@/utils';
import { ZeroPoolState } from '@/state';
import { EthPrivateTransaction, parseHashes, TxType } from './private-tx';
import tokenAbi from './token-abi.json';
import { CONSTANTS, toCompactSignature } from './utils';

const STATE_STORAGE_PREFIX = 'zeropool.eth.state';
const MESSAGE_EVENT_SIGNATURE = 'Message(uint256,bytes32,bytes)';

export interface RelayerInfo {
    root: string;
    deltaIndex: string;
}

async function fetchTransactions(relayerUrl: string, offset: BigInt, limit: number = 100): Promise<string[]> {
    const url = new URL('/transactions', relayerUrl);
    url.searchParams.set('offset', offset.toString());
    url.searchParams.set('limit', limit.toString());

    const res = await (await fetch(url.toString())).json();

    return res;
}

async function sendTransaction(relayerUrl: string, proof: Proof, memo: string, txType: TxType, depositSignature?: string): Promise<string> {
    const url = new URL('/transaction', relayerUrl);
    const res = await fetch(url.toString(), { method: 'POST', body: JSON.stringify({ proof, memo, txType, depositSignature }) });

    if (!res.ok) {
        const body = await res.json();
        throw new Error(`Error ${res.status}: ${JSON.stringify(body)}`)
    }

    const json = await res.json();

    const INTERVAL_MS = 1000;
    let hash;
    while (true) {
        const job = await getJob(relayerUrl, json.jobId);

        if (job === null) {
            console.error(`Job ${json.jobId} not found.`);
            throw new Error('Job not found');
        } else if (job.state === 'failed') {
            throw new Error('Transaction failed');
        } else if (job.state = 'completed') {
            hash = job.txHash;
            break;
        }

        await new Promise(resolve => setTimeout(resolve, INTERVAL_MS));
    }

    if (!hash) {
        throw new Error('Transaction failed');
    }

    console.info(`Transaction successful: ${hash}`);

    return hash;
}

async function getJob(relayerUrl: string, id: string): Promise<{ state: string, txHash: string } | null> {
    const url = new URL(`/job/${id}`, relayerUrl);
    const res = await (await fetch(url.toString())).json();

    if (typeof res === 'string') {
        return null;
    } else {
        return res;
    }
}

async function info(relayerUrl: string): Promise<RelayerInfo> {
    const url = new URL('/info', relayerUrl);
    const res = await fetch(url.toString());

    return await res.json();
}

export class RelayerBackend {
    private zpState: ZeroPoolState;
    private worker: any;
    private tokenContract: Contract;
    private web3: Web3;
    private snarkParams: SnarkParams;
    private tokens: Tokens;

    constructor(tokens: Tokens, web3: Web3, state: ZeroPoolState, snarkParams: SnarkParams, worker: any) {
        this.zpState = state;
        this.worker = worker;
        this.web3 = web3;
        this.tokenContract = new this.web3.eth.Contract(tokenAbi as AbiItem[]) as Contract;
        this.snarkParams = snarkParams;
        this.tokens = tokens;
    }

    public async mint(tokenAddress: string, privateKey: string, amount: string): Promise<void> {
        const address = this.web3.eth.accounts.privateKeyToAccount(privateKey).address;
        const encodedTx = await this.tokenContract.methods.mint(address, BigInt(amount)).encodeABI();
        var txObject: TransactionConfig = {
            from: address,
            to: tokenAddress,
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

    public async getTokenBalance(address: string, tokenAddress: string) {
        this.tokenContract.options.address = tokenAddress; // TODO: Is it possible to pass the contract address to the `call` method?
        return this.tokenContract.methods.balanceOf(address).call();
    }

    // TODO: generalize wei/gwei
    public async deposit(tokenAddress: string, privateKey: string, amountWei: string, fee: string = '0'): Promise<void> {
        const token = this.tokens[tokenAddress];
        const address = this.web3.eth.accounts.privateKeyToAccount(privateKey).address;
        const tokenBalance = await this.getTokenBalance(address, tokenAddress);
        if (amountWei > tokenBalance) {
            throw new Error(`Insufficient balance for deposit. Current balance: ${tokenBalance}`);
        }

        const txType = TxType.Deposit;
        const amountGwei = (BigInt(amountWei) / token.denominator).toString();
        const txData = await this.zpState.account.createDeposit({ amount: amountGwei, fee });
        const txProof = await this.worker.proveTx(txData.public, txData.secret);
        const txValid = Proof.verify(this.snarkParams.transferVk!, txProof.inputs, txProof.proof);
        if (!txValid) {
            throw new Error('invalid tx proof');
        }

        const nullifier = '0x' + BigInt(txData.public.nullifier).toString(16).padStart(64, '0');
        const sign = await this.web3.eth.accounts.sign(nullifier, privateKey);
        const signature = toCompactSignature(sign.signature).slice(2);

        await this.approveAllowance(tokenAddress, privateKey, amountWei);
        await sendTransaction(token.relayerUrl, txProof, txData.memo, txType, signature);
    }

    public async transfer(tokenAddress: string, outsWei: Output[], fee: string = '0'): Promise<void> {
        const token = this.tokens[tokenAddress];
        const txType = TxType.Transfer;
        const outGwei = outsWei.map(({ to, amount }) => {
            if (!validateAddress(to)) {
                throw new Error('Invalid address. Expected a shielded address.');
            }

            return {
                to,
                amount: (BigInt(amount) / token.denominator).toString(),
            }
        });

        const txData = await this.zpState.account.createTransfer({ outputs: outGwei, fee });
        const txProof = await this.worker.proveTx(txData.public, txData.secret);
        const txValid = Proof.verify(this.snarkParams.transferVk!, txProof.inputs, txProof.proof);
        if (!txValid) {
            throw new Error('invalid tx proof');
        }

        await sendTransaction(token.relayerUrl, txProof, txData.memo, txType);
    }

    public async withdraw(tokenAddress: string, privateKey: string, amountWei: string, fee: string = '0'): Promise<void> {
        const token = this.tokens[tokenAddress];

        const txType = TxType.Withdraw;
        const address = this.web3.eth.accounts.privateKeyToAccount(privateKey).address;
        const addressBin = hexToBuf(address);

        const amountGwei = (BigInt(amountWei) / token.denominator).toString();
        const txData = await this.zpState.account.createWithdraw({ amount: amountGwei, to: addressBin, fee, native_amount: '0', energy_amount: '0' });
        const txProof = await this.worker.proveTx(txData.public, txData.secret);
        const txValid = Proof.verify(this.snarkParams.transferVk!, txProof.inputs, txProof.proof);
        if (!txValid) {
            throw new Error('invalid tx proof');
        }

        await sendTransaction(token.relayerUrl, txProof, txData.memo, txType);
    }

    private async approveAllowance(tokenAddress: string, privateKey: string, amount: string): Promise<void> {
        const token = this.tokens[tokenAddress];
        const address = this.web3.eth.accounts.privateKeyToAccount(privateKey).address;
        this.tokenContract.options.address = tokenAddress;
        const curAllowance = await this.tokenContract.methods.allowance(address, token.poolAddress).call();

        if (amount <= curAllowance) {
            console.log(`No need to approve allowance. Current: ${curAllowance}, needed: ${amount}.`);
            return;
        } else {
            console.log(`Approving allowance. Current: ${curAllowance}, needed: ${amount}.`);
            amount = (BigInt(amount) - BigInt(curAllowance)).toString();
        }

        const encodedTx = this.tokenContract.methods.approve(token.poolAddress, BigInt(amount)).encodeABI();
        var txObject: TransactionConfig = {
            from: address,
            to: token.poolAddress,
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

    public getTotalBalance(): string {
        return this.zpState.getTotalBalance();
    }

    /**
     * @returns [total, account, note]
     */
    public getBalances(): [string, string, string] {
        return this.zpState.getBalances();
    }

    public async fetchTransactionsFromRelayer(tokenAddress: string): Promise<void> {
        const OUT = 128;

        const token = this.tokens[tokenAddress];

        let totalNumTx = 100;
        for (let i = 0; i < totalNumTx; i += OUT) { // FIXME: step
            const data = await fetchTransactions(token.relayerUrl, BigInt(i), 100);

            for (let tx of data) {
                let hashes = parseHashes(tx);
                this.cachePrivateTx(tx, hashes, i);
            }
        }
    }

    public async updateState(tokenAddress: string): Promise<void> {
        const STORAGE_PREFIX = `${STATE_STORAGE_PREFIX}.latestCheckedBlock`;

        // TODO: Fetch txs from relayer
        // await this.fetchTransactionsFromRelayer(tokenAddress);

        const token = this.tokens[tokenAddress];
        const curBlockNumber = await this.web3.eth.getBlockNumber();
        const latestCheckedBlock = Number(localStorage.getItem(STORAGE_PREFIX)) || 0;

        // moslty useful for local testing, since getPastLogs always returns at least one latest event
        if (curBlockNumber === latestCheckedBlock) {
            return;
        }

        console.info(`Processing contract events since block ${latestCheckedBlock} to ${curBlockNumber}`);

        const logs = await this.web3.eth.getPastLogs({
            fromBlock: latestCheckedBlock,
            toBlock: curBlockNumber,
            address: token.poolAddress,
            topics: [
                keccak256(MESSAGE_EVENT_SIGNATURE) // FIXME: is this correct?
            ]
        });

        const STEP: number = (CONSTANTS.OUT + 1);
        let index = Number(this.zpState.account.nextTreeIndex());
        for (const log of logs) {
            // TODO: Batch getTransaction
            const tx = await this.web3.eth.getTransaction(log.transactionHash);
            const message = tx.input;
            const txData = EthPrivateTransaction.decode(message);

            let hashes;
            try {
                hashes = txData.hashes;
            } catch (err) {
                console.info(`❌ Skipping invalid transaction: invalid number of outputs ${err.numOutputs}`);
                continue;
            }

            let res = this.cachePrivateTx(txData.ciphertext, hashes, index);
            if (res) {
                index += STEP;
            }
        }

        localStorage.setItem(STORAGE_PREFIX, curBlockNumber.toString());
    }


    /**
     * Attempt to extract and save usable account/notes from transaction data.
     * @param raw hex-encoded transaction data
     */
    private cachePrivateTx(ciphertext: string, hashes: string[], index: number): boolean {
        const data = hexToBuf(ciphertext);
        const pair = this.zpState.account.decryptPair(data);
        const onlyNotes = this.zpState.account.decryptNotes(data);

        // Can't rely on txData.transferIndex here since it can be anything as long as index <= pool index
        if (pair) {
            const notes = pair.notes.reduce<{ note: Note, index: number }[]>((acc, note, noteIndex) => {
                const address = assembleAddress(note.d, note.p_d);
                if (this.zpState.account.isOwnAddress(address)) {
                    acc.push({ note, index: index + 1 + noteIndex });
                }
                return acc;
            }, []);

            console.info(`📝 Adding account, notes, and hashes to state (at index ${index})`);
            this.zpState.account.addAccount(BigInt(index), hashes, pair.account, notes);
        } else if (onlyNotes.length > 0) {
            console.info(`📝 Adding notes and hashes to state (at index ${index})`);
            this.zpState.account.addNotes(BigInt(index), hashes, onlyNotes);
        } else {
            console.info(`📝 Adding hashes to state (at index ${index})`);
            this.zpState.account.addHashes(BigInt(index), hashes);
        }

        console.log('New balance:', this.zpState.account.totalBalance());
        console.log('New state:', this.zpState.account.getWholeState());

        return true;
    }

    public free(): void {
        this.zpState.free();
    }
}
