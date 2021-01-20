import Web3 from 'web3';
import { Account, Transaction as Web3Transaction } from 'web3-core';
import { CoinType } from '@trustwallet/wallet-core';
import { Observable } from 'rxjs';

import { Coin } from '../coin';
import { parseSeedPhrase, SignKeyPair } from '../../utils';
import { Transaction } from '../transaction';
import { convertTransaction } from './utils';
import { Config } from './config';

const TX_CHECK_INTERVAL = 10 * 1000; // TODO: What's the optimal interval for this?

export class EthereumCoin implements Coin {
  private web3: Web3;
  private web3ws: Web3;
  private account: Account;
  private keypair: SignKeyPair;

  constructor(seed: string, config: Config) {
    this.keypair = parseSeedPhrase(seed, CoinType.derivationPath(CoinType.ethereum));
    this.web3 = new Web3(config.httpProviderUrl);
    this.web3ws = new Web3(config.wsProviderUrl);

    const privateKey = Buffer.from(this.keypair.secretKey).toString('hex');
    this.account = this.web3.eth.accounts.privateKeyToAccount(privateKey);
  }

  public getPrivateKey(): string {
    return this.account.privateKey;
  }

  public getPublicKey(): string {
    return Buffer.from(this.keypair.publicKey).toString('hex');
  }

  public getAddress(): string {
    return this.account.address;
  }

  public async getBalance(): Promise<string> {
    return await this.web3.eth.getBalance(this.getAddress());
  }

  public async transfer(to: string, amount: string) {
    await this.web3.eth.sendTransaction({
      from: this.getAddress(),
      to,
      value: amount,
    });
  }

  public async getTransactions(limit: number, offset: number): Promise<Transaction[]> {
    const latesBlock = await this.web3.eth.getBlockNumber();
    let txs: Transaction[] = [];

    // TODO: Optimize
    while (true) {
      const otherTxs = (await this.fetchAccountTransactions(latesBlock, latesBlock - 100))
        .slice(0, limit);
      txs.concat(otherTxs);

      if (txs.length >= limit + offset) {
        break;
      }
    }

    return txs.slice(offset);
  }

  public async subscribe(): Promise<Observable<Transaction>> {
    const web3 = this.web3;
    const sub = this.web3ws.eth.subscribe('pendingTransactions');
    const address = this.getAddress();

    const obs: Observable<Transaction> = new Observable(subscriber => {
      sub.on('data', async txHash => {
        let tx = await web3.eth.getTransaction(txHash);

        if ((tx.to && tx.to.toLowerCase() != address) && tx.from.toLowerCase() != address) {
          return;
        }

        const interval = setInterval(async () => {
          try {
            tx = await web3.eth.getTransaction(txHash);
          } catch (e) {
            clearInterval(interval);
          }

          if (tx.transactionIndex !== null) {
            const block = await web3.eth.getBlock(tx.blockNumber!);

            let timestamp;
            if (typeof block.timestamp == 'string') {
              timestamp = parseInt(block.timestamp);
            } else {
              timestamp = block.timestamp;
            }

            subscriber.next(convertTransaction(tx, timestamp));

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

  public toBaseUnit(amount: string): string {
    return this.web3.utils.fromWei(amount);
  }

  public fromBaseUnit(amount: string): string {
    return this.web3.utils.toWei(amount);
  }

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
