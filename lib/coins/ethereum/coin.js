var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import Web3 from 'web3';
import { Observable } from 'rxjs';
import BN from 'bn.js';
import tokenAbi from './token-abi.json';
import { Coin } from '../coin';
import { CoinType } from '../coin-type';
import { TxStatus } from '../transaction';
import { convertTransaction, toCompactSignature, toTwosComplementHex } from './utils';
import { LocalTxStorage } from './storage';
import { AccountCache } from './account';
import { EthPrivateTransaction, TxType, txTypeToString } from './private-tx';
import { hexToBuf } from '../../utils';
import { RelayerAPI } from './relayer';
// TODO: Organize presistent state properly
const DENOMINATOR = BigInt(1000000000);
const TX_CHECK_INTERVAL = 10 * 1000;
const TX_STORAGE_PREFIX = 'zeropool.eth-txs';
const STATE_STORAGE_PREFIX = 'zeropool.eth.state';
export class EthereumCoin extends Coin {
    constructor(mnemonic, config, transferParams, treeParams) {
        super(mnemonic);
        this.web3 = new Web3(config.httpProviderUrl);
        this.web3ws = new Web3(config.wsProviderUrl);
        this.txStorage = new LocalTxStorage(TX_STORAGE_PREFIX);
        this.accounts = new AccountCache(mnemonic, this.web3);
        this.config = config;
        this.transferParams = transferParams;
        this.treeParams = treeParams;
        this.relayer = new RelayerAPI(new URL('http://localhost')); // TODO: dynamic relayer URL
        this.tokenContract = new this.web3.eth.Contract(tokenAbi, config.tokenContractAddress);
    }
    init() {
        const _super = Object.create(null, {
            init: { get: () => super.init }
        });
        return __awaiter(this, void 0, void 0, function* () {
            yield _super.init.call(this);
            yield this.updatePrivateState();
        });
    }
    getPrivateKey(account) {
        return this.accounts.getOrCreate(account).account.privateKey;
    }
    getPublicKey(account) {
        return this.accounts.getOrCreate(account).keypair.publicKey.toString('hex');
    }
    getAddress(account) {
        return this.accounts.getOrCreate(account).account.address;
    }
    getBalance(account) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield this.web3.eth.getBalance(this.getAddress(account));
        });
    }
    transfer(account, to, amount) {
        return __awaiter(this, void 0, void 0, function* () {
            const from = this.getAddress(account);
            const nonce = yield this.web3.eth.getTransactionCount(this.getAddress(account));
            const gas = yield this.web3.eth.estimateGas({ from, to, value: amount });
            const gasPrice = yield this.web3.eth.getGasPrice();
            const signed = yield this.web3.eth.accounts.signTransaction({
                from,
                to,
                value: amount,
                nonce,
                gas,
                gasPrice,
            }, this.getPrivateKey(account));
            const receipt = yield this.web3.eth.sendSignedTransaction(signed.rawTransaction);
            const block = yield this.web3.eth.getBlock(receipt.blockNumber);
            let timestamp;
            if (typeof block.timestamp == 'string') {
                timestamp = parseInt(block.timestamp);
            }
            else {
                timestamp = block.timestamp;
            }
            let status = TxStatus.Completed;
            if (!receipt.status) {
                status = TxStatus.Error;
            }
            const nativeTx = yield this.web3.eth.getTransaction(receipt.transactionHash);
            const tx = convertTransaction(nativeTx, timestamp, status);
            this.txStorage.add(this.getAddress(account), tx);
        });
    }
    getTransactions(account, limit, offset) {
        return __awaiter(this, void 0, void 0, function* () {
            const numTx = yield this.web3.eth.getTransactionCount(this.getAddress(account));
            if (numTx === 0) {
                return [];
            }
            const txs = this.txStorage.list(this.getAddress(account));
            return txs.slice(offset, offset + limit);
        });
    }
    subscribe(account) {
        return __awaiter(this, void 0, void 0, function* () {
            const web3 = this.web3;
            const sub = this.web3ws.eth.subscribe('pendingTransactions');
            const address = this.getAddress(account);
            const obs = new Observable(subscriber => {
                sub.on('data', (txHash) => __awaiter(this, void 0, void 0, function* () {
                    let nativeTx = yield web3.eth.getTransaction(txHash);
                    if ((nativeTx.to && nativeTx.to.toLowerCase() != address) && nativeTx.from.toLowerCase() != address) {
                        return;
                    }
                    // Periodically check status of the transaction
                    const interval = setInterval(() => __awaiter(this, void 0, void 0, function* () {
                        try {
                            nativeTx = yield web3.eth.getTransaction(txHash);
                        }
                        catch (e) {
                            clearInterval(interval);
                        }
                        if (nativeTx.transactionIndex !== null) {
                            const block = yield web3.eth.getBlock(nativeTx.blockNumber);
                            let timestamp;
                            if (typeof block.timestamp == 'string') {
                                timestamp = parseInt(block.timestamp);
                            }
                            else {
                                timestamp = block.timestamp;
                            }
                            const tx = convertTransaction(nativeTx, timestamp);
                            // Relevant transaction found, update tx cache and notify listeners
                            this.txStorage.add(this.getAddress(account), tx);
                            subscriber.next(tx);
                            clearInterval(interval);
                        }
                    }), TX_CHECK_INTERVAL); // TODO: What's the optimal interval for this?
                }))
                    .on('error', error => {
                    subscriber.error(error);
                });
                return function unsubscribe() {
                    sub.unsubscribe();
                };
            });
            return obs;
        });
    }
    /**
     * Converts ether to Wei.
     * @param amount in Ether
     */
    toBaseUnit(amount) {
        return this.web3.utils.toWei(amount, 'ether');
    }
    /**
     * Converts Wei to ether.
     * @param amount in Wei
     */
    fromBaseUnit(amount) {
        return this.web3.utils.fromWei(amount, 'ether');
    }
    estimateTxFee() {
        return __awaiter(this, void 0, void 0, function* () {
            const gas = yield this.web3.eth.estimateGas({
                from: this.getAddress(0),
                to: this.getAddress(0),
                value: this.toBaseUnit('1'),
            });
            const gasPrice = yield this.web3.eth.getGasPrice();
            const fee = new BN(gas).mul(new BN(gasPrice));
            return {
                gas: gas.toString(),
                gasPrice,
                fee: this.fromBaseUnit(fee.toString()),
            };
        });
    }
    getCoinType() {
        return CoinType.ethereum;
    }
    // deposit
    // transfer
    /**
     * coin.transferPublicToPrivate(0, [{ to: 'addr', amount: '123' }])
     * @param account
     * @param outputs
     */
    transferPublicToPrivate(account, outputs) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.updatePrivateState();
            // Check balance
            const totalOut = outputs.reduce((acc, cur) => {
                const amount = BigInt(cur.amount);
                return acc + amount;
            }, BigInt(0));
            const curBalance = BigInt(yield this.getBalance(account));
            if (totalOut > curBalance) {
                throw new Error('Insufficient balance');
            }
            // TODO: Merge unspent notes?
            // await this.mergePrivate();
            // Deposit if needed
            const privateBalance = BigInt(this.getPrivateBalance());
            if (privateBalance < totalOut) {
                yield this.depositPrivate(account, (totalOut - privateBalance).toString());
            }
            // Transfer
            yield this.transferPrivateToPrivate(account, outputs);
        });
    }
    transferPrivateToPrivate(account, outs) {
        return __awaiter(this, void 0, void 0, function* () {
            const memo = new Uint8Array(8); // FIXME: fee
            yield this.signAndSendPrivateTx(account, TxType.Transfer, outs, memo);
        });
    }
    depositPrivate(account, amount) {
        return __awaiter(this, void 0, void 0, function* () {
            const memo = new Uint8Array(8); // FIXME: fee
            yield this.approveAllowance(account, amount);
            yield this.signAndSendPrivateTx(account, TxType.Deposit, amount, memo);
        });
    }
    approveAllowance(account, amount) {
        return __awaiter(this, void 0, void 0, function* () {
            const address = this.getAddress(account);
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
            const signedTx = yield this.web3.eth.accounts.signTransaction(txObject, this.getPrivateKey(account));
            const result = yield this.web3.eth.sendSignedTransaction(signedTx.rawTransaction);
            console.log('approve', result);
        });
    }
    withdrawPrivate(account, amount) {
        return __awaiter(this, void 0, void 0, function* () {
            const address = this.getAddress(account);
            const memo = new Uint8Array(8 + 8 + 20); // fee + amount + address
            const amountBn = hexToBuf(toTwosComplementHex(BigInt(amount) / DENOMINATOR, 8));
            memo.set(amountBn, 8);
            const addressBin = hexToBuf(address);
            memo.set(addressBin, 16);
            yield this.signAndSendPrivateTx(account, TxType.Withdraw, amount, memo);
        });
    }
    signAndSendPrivateTx(account, txType, outWei, memo) {
        return __awaiter(this, void 0, void 0, function* () {
            const address = this.getAddress(account);
            const privateKey = this.getPrivateKey(account);
            let outGwei;
            if (typeof outWei === 'string') {
                outGwei = (BigInt(outWei) / DENOMINATOR).toString();
            }
            else {
                outGwei = outWei.map(({ to, amount }) => ({
                    to,
                    amount: (BigInt(amount) / DENOMINATOR).toString(),
                }));
            }
            const txData = yield this.privateAccount.createTx(txTypeToString(txType), outGwei, memo);
            const tx = EthPrivateTransaction.fromData(txData, txType, this.privateAccount, this.transferParams, this.treeParams, this.web3);
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
            txObject.gas = gas;
            txObject.gasPrice = `0x${gasPrice.toString(16)}`;
            txObject.nonce = nonce;
            const signed = yield this.web3.eth.accounts.signTransaction(txObject, privateKey);
            const result = yield this.web3.eth.sendSignedTransaction(signed.rawTransaction);
            console.log(txTypeToString(txType), result);
        });
    }
    getPrivateBalance() {
        return this.privateAccount.totalBalance();
    }
    /**
     * Attempt to extract and save usable account/notes from transaction data.
     * @param raw hex-encoded transaction data
     */
    cachePrivateTx(raw) {
        const txData = EthPrivateTransaction.decode(raw);
        const ciphertext = hexToBuf(txData.ciphertext);
        const pair = this.privateAccount.decryptPair(ciphertext);
        let notes;
        if (pair) {
            this.privateAccount.addAccount(txData.transferIndex, pair.account);
            notes = pair.notes.map((note, index) => ({ note, index }));
        }
        else {
            notes = this.privateAccount.decryptNotes(ciphertext);
        }
        for (const note of notes) {
            this.privateAccount.addReceivedNote(txData.transferIndex + BigInt(1) + BigInt(note.index), note.note);
        }
    }
    updatePrivateState() {
        return __awaiter(this, void 0, void 0, function* () {
            const STORAGE_PREFIX = `${STATE_STORAGE_PREFIX}.latestCheckedBlock`;
            const latestCheckedBlock = Number(localStorage.getItem(STORAGE_PREFIX));
            const logs = yield this.web3.eth.getPastLogs({ fromBlock: latestCheckedBlock || this.config.contractBlock, address: this.config.contractAddress });
            let newLatestBlock = this.config.contractBlock;
            for (const log of logs) {
                const tx = yield this.web3.eth.getTransaction(log.transactionHash);
                const message = tx.input;
                newLatestBlock = tx.blockNumber;
                try {
                    this.cachePrivateTx(message);
                }
                catch (e) {
                    continue;
                }
            }
            localStorage.setItem(STORAGE_PREFIX, newLatestBlock.toString());
        });
    }
}
//# sourceMappingURL=coin.js.map