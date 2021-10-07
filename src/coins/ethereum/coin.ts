import Web3 from 'web3';
import { Observable } from 'rxjs';
import BN from 'bn.js';
import { Note, Output, Params } from 'libzeropool-rs-wasm-bundler';
import { TransactionConfig } from 'web3-core';

import { Coin } from '../coin';
import { CoinType } from '../coin-type';
import { Transaction, TxFee, TxStatus } from '../transaction';
import { convertTransaction, toCompactSignature } from './utils';
import { Config } from './config';
import { LocalTxStorage } from './storage';
import { AccountCache } from './account';
import { EthPrivateTransaction, TxType } from './private-tx';
import { hexToBuf } from '../../utils';
import { RelayerAPI } from './relayer';
import { TransactionFactory, TxData, TypedTransaction } from '@ethereumjs/tx';

// TODO: Organize presistent state properly

const TX_CHECK_INTERVAL = 10 * 1000;
const TX_STORAGE_PREFIX = 'zeropool.eth-txs';
const STATE_STORAGE_PREFIX = 'zeropool.eth.state';

export class EthereumCoin extends Coin {
  private web3: Web3;
  private web3ws: Web3;
  private txStorage: LocalTxStorage;
  private accounts: AccountCache;
  private config: Config;
  private transferParams: Params;
  private treeParams: Params;
  private relayer: RelayerAPI;

  constructor(mnemonic: string, config: Config, transferParams: Params, treeParams: Params) {
    super(mnemonic);
    this.web3 = new Web3(config.httpProviderUrl);
    this.web3ws = new Web3(config.wsProviderUrl);
    this.txStorage = new LocalTxStorage(TX_STORAGE_PREFIX);
    this.accounts = new AccountCache(mnemonic, this.web3);
    this.config = config;
    this.transferParams = transferParams;
    this.treeParams = treeParams;
    this.relayer = new RelayerAPI(new URL('http://localhost')); // TODO: dynamic relayer URL
  }

  protected async init() {
    await super.init();
    await this.updatePrivateState();
  }

  public getPrivateKey(account: number): string {
    return this.accounts.getOrCreate(account).account.privateKey;
  }

  public getPublicKey(account: number): string {
    return this.accounts.getOrCreate(account).keypair.publicKey.toString('hex');
  }

  public getAddress(account: number): string {
    return this.accounts.getOrCreate(account).account.address;
  }

  public async getBalance(account: number): Promise<string> {
    return await this.web3.eth.getBalance(this.getAddress(account));
  }

  public async transfer(account: number, to: string, amount: string) {
    const from = this.getAddress(account);
    const nonce = await this.web3.eth.getTransactionCount(this.getAddress(account));
    const gas = await this.web3.eth.estimateGas({ from, to, value: amount });
    const gasPrice = await this.web3.eth.getGasPrice();
    const signed = await this.web3.eth.accounts.signTransaction({
      from,
      to,
      value: amount,
      nonce,
      gas,
      gasPrice,
    }, this.getPrivateKey(account))

    const receipt = await this.web3.eth.sendSignedTransaction(signed.rawTransaction!);
    const block = await this.web3.eth.getBlock(receipt.blockNumber);

    let timestamp;
    if (typeof block.timestamp == 'string') {
      timestamp = parseInt(block.timestamp);
    } else {
      timestamp = block.timestamp;
    }

    let status = TxStatus.Completed;
    if (!receipt.status) {
      status = TxStatus.Error;
    }

    const nativeTx = await this.web3.eth.getTransaction(receipt.transactionHash);
    const tx = convertTransaction(nativeTx, timestamp, status);

    this.txStorage.add(this.getAddress(account), tx);
  }

  public async getTransactions(account: number, limit: number, offset: number): Promise<Transaction[]> {
    const numTx = await this.web3.eth.getTransactionCount(this.getAddress(account));

    if (numTx === 0) {
      return [];
    }

    const txs = this.txStorage.list(this.getAddress(account));
    return txs.slice(offset, offset + limit);
  }

  public async subscribe(account: number): Promise<Observable<Transaction>> {
    const web3 = this.web3;
    const sub = this.web3ws.eth.subscribe('pendingTransactions');
    const address = this.getAddress(account);

    const obs: Observable<Transaction> = new Observable(subscriber => {
      sub.on('data', async txHash => {
        let nativeTx = await web3.eth.getTransaction(txHash);

        if ((nativeTx.to && nativeTx.to.toLowerCase() != address) && nativeTx.from.toLowerCase() != address) {
          return;
        }

        // Periodically check status of the transaction
        const interval = setInterval(async () => {
          try {
            nativeTx = await web3.eth.getTransaction(txHash);
          } catch (e) {
            clearInterval(interval);
          }

          if (nativeTx.transactionIndex !== null) {
            const block = await web3.eth.getBlock(nativeTx.blockNumber!);

            let timestamp;
            if (typeof block.timestamp == 'string') {
              timestamp = parseInt(block.timestamp);
            } else {
              timestamp = block.timestamp;
            }

            const tx = convertTransaction(nativeTx, timestamp);

            // Relevant transaction found, update tx cache and notify listeners
            this.txStorage.add(this.getAddress(account), tx);
            subscriber.next(tx);

            clearInterval(interval);
          }
        }, TX_CHECK_INTERVAL); // TODO: What's the optimal interval for this?
      })
        .on('error', error => {
          subscriber.error(error);
        });

      return function unsubscribe() {
        sub.unsubscribe();
      }
    });

    return obs;
  }

  /**
   * Converts ether to Wei.
   * @param amount in Ether
   */
  public toBaseUnit(amount: string): string {
    return this.web3.utils.toWei(amount, 'ether');
  }

  /**
   * Converts Wei to ether.
   * @param amount in Wei
   */
  public fromBaseUnit(amount: string): string {
    return this.web3.utils.fromWei(amount, 'ether');
  }

  public async estimateTxFee(): Promise<TxFee> {
    const gas = await this.web3.eth.estimateGas({
      from: this.getAddress(0),
      to: this.getAddress(0),
      value: this.toBaseUnit('1'),
    });
    const gasPrice = await this.web3.eth.getGasPrice();
    const fee = new BN(gas).mul(new BN(gasPrice));

    return {
      gas: gas.toString(),
      gasPrice,
      fee: this.fromBaseUnit(fee.toString()),
    };
  }

  public getCoinType(): CoinType {
    return CoinType.ethereum;
  }

  // deposit
  // transfer
  /**
   * coin.transferPublicToPrivate(0, [{ to: 'addr', amount: '123' }])
   * @param account 
   * @param outputs 
   */
  public async transferPublicToPrivate(account: number, outputs: Output[]): Promise<void> {
    await this.updatePrivateState();

    // Check balance
    const totalOut = outputs.reduce((acc, cur) => {
      const amount = BigInt(cur.amount);
      return acc + amount;
    }, BigInt(0));

    const curBalance = BigInt(await this.getBalance(account));

    if (totalOut > curBalance) {
      throw new Error('Insufficient balance');
    }

    // Merge unspent notes
    await this.mergePrivate();

    // Deposit if needed
    const privateBalance = BigInt(this.getPrivateBalance());
    if (privateBalance < totalOut) {
      await this.depositPrivate(account, (totalOut - privateBalance).toString());
    }

    // Transfer
    await this.transferPrivateToPrivate(account, outputs);
  }

  public async transferPrivateToPrivate(account: number, outs: Output[]): Promise<void> {
    const address = this.getAddress(account);
    const memo = new Uint8Array(8); // FIXME: fee
    const txData = await this.privateAccount.createTx('transfer', outs, memo);
    const tx = EthPrivateTransaction.fromData(txData, TxType.Transfer, this.privateAccount, this.transferParams, this.treeParams, this.web3);
    const data = tx.encode();
    const txObject: TransactionConfig = {
      from: address,
      to: this.config.contractAddress,
      data,
    };

    const signed = await this.prepareTranaction(txObject, account);

    await this.web3.eth.sendSignedTransaction(signed);
  }

  public async depositPrivate(account: number, amount: string): Promise<void> {
    const address = this.getAddress(account);
    const memo = new Uint8Array(8); // FIXME: fee
    const txData = await this.privateAccount.createTx('deposit', amount, memo);
    const tx = EthPrivateTransaction.fromData(txData, TxType.Deposit, this.privateAccount, this.transferParams, this.treeParams, this.web3);
    const data = tx.encode();
    const txObject: TransactionConfig = {
      from: address,
      to: this.config.contractAddress,
      data,
    };

    const nullifier = BigInt(txData.public.nullifier).toString(16).padStart(64, '0');

    const signed = await this.prepareTranaction(txObject, account, nullifier);

    await this.web3.eth.sendSignedTransaction(signed);
  }

  // public async mergePrivate(): Promise<void> {
  //   throw new Error('unimplemented');
  // }

  public async withdrawPrivate(account: number, amount: string): Promise<void> {
    if (Math.sign(Number(amount)) === 1) {
      amount = (-BigInt(amount)).toString();
    }

    const address = this.getAddress(account);
    const memo = new Uint8Array(8 + 20); // FIXME: fee + address
    const txData = await this.privateAccount.createTx('withdraw', amount, memo);
    const tx = EthPrivateTransaction.fromData(txData, TxType.Withdraw, this.privateAccount, this.transferParams, this.treeParams, this.web3);
    const data = tx.encode();
    const txObject: TransactionConfig = {
      from: address,
      to: this.config.contractAddress,
      data,
    };

    const signed = await this.prepareTranaction(txObject, account);

    await this.web3.eth.sendSignedTransaction(signed);
  }

  private async prepareTranaction(txObject: TransactionConfig, account: number, nullifier?: string): Promise<string> {
    const address = this.getAddress(account);
    const privateKey = this.getPrivateKey(account);

    if (nullifier) {
      const sign = await this.web3.eth.accounts.sign(nullifier, privateKey);
      const signature = toCompactSignature(sign.signature).slice(2);
      txObject.data += signature;
    }

    const gas = await this.web3.eth.estimateGas(txObject);
    const gasPrice = await this.web3.eth.getGasPrice();
    const nonce = await this.web3.eth.getTransactionCount(address);
    txObject.gas = gas;
    txObject.gasPrice = gasPrice;
    txObject.nonce = nonce;

    const tx = TransactionFactory.fromTxData(txObject as TxData);
    tx.sign(Buffer.from(privateKey, 'hex'));
    const signed = tx.serialize().toString('hex');

    return signed;
  }

  public getPrivateBalance(): string {
    return this.privateAccount.totalBalance();
  }

  /**
   * Attempt to extract and save usable account/notes from transaction data.
   * @param raw hex-encoded transaction data
   */
  private cachePrivateTx(raw: string) {
    const txData = EthPrivateTransaction.decode(raw);
    const ciphertext = hexToBuf(txData.ciphertext);
    const pair = this.privateAccount.decryptPair(ciphertext);

    let notes: { note: Note, index: number }[];
    if (pair) {
      this.privateAccount.addAccount(txData.transferIndex, pair.account);
      notes = pair.notes.map((note, index) => ({ note, index }));
    } else {
      notes = this.privateAccount.decryptNotes(ciphertext);
    }

    for (const note of notes) {
      this.privateAccount.addReceivedNote(txData.transferIndex + BigInt(1) + BigInt(note.index), note.note);
    }
  }

  public async updatePrivateState(): Promise<void> {
    const STORAGE_PREFIX = `${STATE_STORAGE_PREFIX}.latestCheckedBlock`;

    const latestCheckedBlock = Number(localStorage.getItem(STORAGE_PREFIX));
    const logs = await this.web3.eth.getPastLogs({ fromBlock: latestCheckedBlock || this.config.contractBlock, address: this.config.contractAddress });

    let newLatestBlock = this.config.contractBlock;
    for (const log of logs) {
      const tx = await this.web3.eth.getTransaction(log.transactionHash);
      const message = tx.input;
      newLatestBlock = tx.blockNumber!;

      try {
        this.cachePrivateTx(message);
      } catch (e) {
        continue;
      }
    }

    localStorage.setItem(STORAGE_PREFIX, newLatestBlock.toString());
  }
}
