import Web3 from 'web3';
import { Contract } from 'web3-eth-contract';
import { AbiItem, hexToBytes, hexToString } from 'web3-utils';
import { Observable } from 'rxjs';
import BN from 'bn.js';
import bs64 from 'base64-js';
import { Output, Params } from 'libzeropool-rs-wasm-bundler';
import { TransactionConfig } from 'web3-core';

import { Coin } from '../coin';
import { CoinType } from '../coin-type';
import { Transaction, TxFee, TxStatus } from '../transaction';
import { convertTransaction } from './utils';
import { Config } from './config';
import { LocalTxStorage } from './storage';
import { AccountCache } from './account';
import { EthPrivateTransaction, TxType } from './private-tx';
import { hexToBuf } from '../../utils';
import { RelayerAPI } from './relayer';

const TX_CHECK_INTERVAL = 10 * 1000;
const TX_STORAGE_PREFIX = 'zeropool.eth-txs';
const MAX_SCAN_TASKS = 100;

export class EthereumCoin extends Coin {
  private web3: Web3;
  private web3ws: Web3;
  private txStorage: LocalTxStorage;
  private accounts: AccountCache;
  private config: Config;
  private params: Params;
  private relayer: RelayerAPI;

  constructor(mnemonic: string, config: Config, params: Params) {
    super(mnemonic);
    this.web3 = new Web3(config.httpProviderUrl);
    this.web3ws = new Web3(config.wsProviderUrl);
    this.txStorage = new LocalTxStorage(TX_STORAGE_PREFIX);
    this.accounts = new AccountCache(mnemonic, this.web3);
    this.config = config;
    this.params = params;
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

  // public async transferPrivate(account: number, outputs: Output[]): Promise<void> {
  //   await this.updatePrivateState();

  //   const address = this.getAddress(0);
  //   const newPrivateAddress = this.privateAccount.generateAddress();

  //   // Check balance
  //   const totalOut = outputs.reduce((acc, cur) => {
  //     const amount = BigInt(cur.amount);
  //     return acc + amount;
  //   }, BigInt(0));

  //   const curBalance = BigInt(await this.getBalance(account));

  //   if (totalOut > curBalance) {
  //     throw new Error('Insufficient balance');
  //   }

  //   // TODO: Check if there needs to be a merge
  //   await this.mergePrivate();

  //   // Deposit if needed
  //   const privateBalance = BigInt(this.getPrivateBalance());
  //   if (privateBalance < totalOut) {
  //     await this.depositPrivate(account, totalOut - privateBalance);
  //   }

  //   // Transfer
  //   await this.transferPrivateSimple(account, outputs);
  // }

  public async trasnferPrivateSimple(account: number, outs: Output[]): Promise<void> {
    const address = this.getAddress(account);
    const memo = new Uint8Array(8); // fee
    const txData = await this.privateAccount.createTx('transfer', outs, memo);
    const tx = EthPrivateTransaction.fromData(txData, TxType.Transfer, this.privateAccount, this.params, this.web3).encode();
    const txObject: TransactionConfig = {
      from: address,
      to: this.config.contractAddress,
      data: tx,
    };

    const signed = await this.prepareTranaction(txObject, account);

    await this.web3.eth.sendSignedTransaction(signed);
  }

  public async depositPrivate(account: number, amount: string): Promise<void> {
    const address = this.getAddress(account);
    const memo = new Uint8Array(8); // FIXME: fee
    const txData = await this.privateAccount.createTx('deposit', amount, memo);
    const tx = EthPrivateTransaction.fromData(txData, TxType.Deposit, this.privateAccount, this.params, this.web3).encode();
    const txObject: TransactionConfig = {
      from: address,
      to: this.config.contractAddress,
      data: tx,
      value: amount,
    };

    const signed = await this.prepareTranaction(txObject, account);

    await this.web3.eth.sendSignedTransaction(signed);
  }

  public async mergePrivate(): Promise<void> {
    throw new Error('unimplemented');
  }

  public async withdrawPrivate(account: number, amount: string): Promise<void> {
    if (Math.sign(Number(amount)) === 1) {
      amount = (-BigInt(amount)).toString();
    }

    const address = this.getAddress(account);
    const memo = new Uint8Array(8 + 20); // FIXME: fee + address
    const txData = await this.privateAccount.createTx('withdraw', amount, memo);
    const tx = EthPrivateTransaction.fromData(txData, TxType.Withdraw, this.privateAccount, this.params, this.web3).encode();
    const txObject: TransactionConfig = {
      from: address,
      to: this.config.contractAddress,
      data: tx,
    };

    const signed = await this.prepareTranaction(txObject, account);

    await this.web3.eth.sendSignedTransaction(signed);
  }

  private async prepareTranaction(txObject: TransactionConfig, account: number): Promise<string> {
    const address = this.getAddress(account);
    const gas = await this.web3.eth.estimateGas(txObject);
    const gasPrice = await this.web3.eth.getGasPrice();
    const nonce = await this.web3.eth.getTransactionCount(address);
    txObject.gas = gas;
    txObject.gasPrice = gasPrice;
    txObject.nonce = nonce;

    const signed = await this.web3.eth.accounts.signTransaction(txObject, this.getPrivateKey(account));

    return signed.rawTransaction!;
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

    if (pair) {
      this.privateAccount.addAccount(txData.transferIndex, pair.account);
      // TODO: Add notes, if needed
    } else {
      const notes = this.privateAccount.decryptNotes(ciphertext);

      if (notes.length > 0) {
        for (let i = 0; i < notes.length; ++i) {
          const note = notes[i];
          this.privateAccount.addReceivedNote(txData.transferIndex + BigInt(1) + BigInt(i), note);
        }
      }
    }
  }

  public async updatePrivateState(): Promise<void> {
    const logs = await this.web3.eth.getPastLogs({ fromBlock: this.config.contractBlock, address: this.config.contractAddress });

    for (const log of logs) {
      const tx = await this.web3.eth.getTransaction(log.transactionHash);
      const message = tx.input;

      try {
        this.cachePrivateTx(message);
      } catch (e) {
        continue;
      }
    }
  }

  // TODO: These functions scan all blocks for regular transactions.
  //       Should probably remove them.
  /**
   * Scans blocks for account transactions (both from and to).
   * @param startBlockNumber
   * @param endBlockNumber
   * @param batchSize maximum number of parallel scans
   */
  private async fetchAccountTransactions(account: number, startBlockNumber: number, endBlockNumber: number, batchSize: number = MAX_SCAN_TASKS): Promise<Transaction[]> {
    if (endBlockNumber > startBlockNumber) {
      throw new Error('startBlockNumber must be higher than endBlockNumber');
    }

    const address = this.getAddress(account);
    let transactions: Transaction[] = [];

    for (let batch = 0; batch < startBlockNumber - endBlockNumber; batch += batchSize) {
      let promises: Promise<Transaction[]>[] = [];
      for (let currentBlock = startBlockNumber - batch * batchSize; currentBlock >= endBlockNumber - batch * batchSize; --currentBlock) {
        promises.push(this.scanBlock(address, currentBlock));
      }

      const results = await Promise.all(promises);
      for (let txs of results) {
        transactions.push(...txs);
      }
    }

    return transactions;
  }

  /**
   * Scan block for account transactions.
   * @param address
   * @param blockNumber
   */
  private async scanBlock(address: string, blockNumber: number): Promise<Transaction[]> {
    let transactions: Transaction[] = [];

    const block = await this.web3.eth.getBlock(blockNumber, true);
    if (block != null && block.transactions != null) {
      for (const tx of block.transactions) {
        if (address == tx.from || address == tx.to) {
          const timestamp = (typeof block.timestamp == 'string') ? parseInt(block.timestamp) : block.timestamp;
          const newTx = convertTransaction(tx, timestamp);
          transactions.push(newTx);
        }
      }
    }

    return transactions;
  }
}
