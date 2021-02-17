import Web3 from 'web3';
import { Account, Transaction as Web3Transaction } from 'web3-core';
import { Observable } from 'rxjs';
import BN from 'bn.js';

import { Coin } from '../coin';
import { CoinType } from '../coin-type';
import { parseMnemonic, HDKey } from '../../utils';
import { Transaction, TxFee, TxStatus } from '../transaction';
import { convertTransaction } from './utils';
import { Config } from './config';
import { LocalTxStorage } from './storage';

const TX_CHECK_INTERVAL = 10 * 1000; // TODO: What's the optimal interval for this?
const TX_STORAGE_PREFIX = 'zeropool.eth-txs';

export class EthereumCoin implements Coin {
  private web3: Web3;
  private web3ws: Web3;
  private account: Account;
  private keypair: HDKey;
  private txStorage: LocalTxStorage;

  constructor(seed: string, config: Config, account: number) {
    this.keypair = parseMnemonic(seed, CoinType.ethereum, account);
    this.web3 = new Web3(config.httpProviderUrl);
    this.web3ws = new Web3(config.wsProviderUrl);
    this.txStorage = new LocalTxStorage(TX_STORAGE_PREFIX)

    const privateKey = '0x' + this.keypair.privateKey.toString('hex');
    this.account = this.web3.eth.accounts.privateKeyToAccount(privateKey);
  }

  public getPrivateKey(): string {
    return this.account.privateKey;
  }

  public getPublicKey(): string {
    return this.keypair.publicKey.toString('hex');
  }

  public getAddress(): string {
    return this.account.address;
  }

  public async getBalance(): Promise<string> {
    return await this.web3.eth.getBalance(this.getAddress());
  }

  public async transfer(to: string, amount: string) {
    const from = this.getAddress();
    const nonce = await this.web3.eth.getTransactionCount(this.getAddress());
    const gas = await this.web3.eth.estimateGas({ from, to, value: amount });
    const gasPrice = await this.web3.eth.getGasPrice();
    const signed = await this.web3.eth.accounts.signTransaction({
      from,
      to,
      value: amount,
      nonce,
      gas,
      gasPrice,
    }, this.getPrivateKey())

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

    this.txStorage.add(this.getAddress(), tx);
  }

  public async getTransactions(limit: number, offset: number): Promise<Transaction[]> {
    const txs = this.txStorage.list(this.getAddress());
    return txs.slice(offset, offset + limit);
  }

  public async subscribe(): Promise<Observable<Transaction>> {
    const web3 = this.web3;
    const sub = this.web3ws.eth.subscribe('pendingTransactions');
    const address = this.getAddress();

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
            this.txStorage.add(this.getAddress(), tx);
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
      from: this.getAddress(),
      to: this.getAddress(),
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

  /**
   * Scans blocks for account transactions (both from and to)
   * @param startBlockNumber
   * @param endBlockNumber
   */
  private async fetchAccountTransactions(startBlockNumber: number, endBlockNumber: number): Promise<Transaction[]> {
    const address = this.getAddress();
    let transactions: Transaction[] = [];

    // TODO: Parallelize scan
    for (let i = startBlockNumber; i >= endBlockNumber; --i) {
      const block = await this.web3.eth.getBlock(i, true);
      if (block != null && block.transactions != null) {
        for (const tx of block.transactions) {
          if (address == tx.from || address == tx.to) {
            const timestamp = (typeof block.timestamp == 'string') ? parseInt(block.timestamp) : block.timestamp;
            const newTx = convertTransaction(tx, timestamp);
            transactions.push(newTx);
          }
        }
      }
    }

    return transactions;
  }
}
