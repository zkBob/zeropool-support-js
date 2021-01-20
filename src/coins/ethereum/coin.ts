import Web3 from 'web3';
import { Account, Transaction as Web3Transaction } from 'web3-core';
import { CoinType } from '@trustwallet/wallet-core';
import { Observable } from 'rxjs';

import { Coin } from '../coin';
import { parseSeedPhrase, SignKeyPair } from '../../utils';
import { Transaction } from '../transaction';
import { convertTransaction } from './utils';
import { Config } from './config';

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

  public async getTransactions(from: number, to: number): Promise<Transaction[]> {
    const [startBlock, endBlock] = await Promise.all([this.getBlockByTime(from), this.getBlockByTime(to)]);
    const nativeTxs = await this.fetchAccountTransactions(this.getAddress(), startBlock, endBlock);

    return nativeTxs.map(convertTransaction);
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
            subscriber.next(convertTransaction(tx));
            clearInterval(interval);
          }
        }, 10 * 1000); // TODO: What's the optimal interval for this?
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

  private async fetchAccountTransactions(address: string, startBlockNumber: number, endBlockNumber?: number): Promise<Web3Transaction[]> {
    if (!endBlockNumber) {
      endBlockNumber = await this.web3.eth.getBlockNumber();
    }

    let transactions: Web3Transaction[] = [];

    for (let i = startBlockNumber; i <= endBlockNumber; i++) {
      const block = await this.web3.eth.getBlock(i, true);
      if (block != null && block.transactions != null) {
        for (const tx of block.transactions) {
          if (address == tx.from || address == tx.to) {
            transactions.push(tx);
          }
        }
      }
    }

    return transactions;
  }

  // Based on https://github.com/ethfinex/efx-trustless-vol/blob/5a27906b71617fdb236a2b8f300e4a9e7d417e40/src/lib/getBlockByTime.js#L10
  private async getBlockByTime(targetTimestamp: number): Promise<number> {
    // TODO: Make limits configurable?
    const lowerLimitStamp = targetTimestamp - 60;
    const higherLimitStamp = targetTimestamp + 60;

    // decreasing average block size will decrease precision and also
    // decrease the amount of requests made in order to find the closest
    // block
    let averageBlockTime = 17 * 1.5

    // get current block number
    const currentBlockNumber = await this.web3.eth.getBlockNumber();
    let block = await this.web3.eth.getBlock(currentBlockNumber);
    let blockNumber = currentBlockNumber;

    while (block.timestamp > targetTimestamp) {
      const timestamp = (typeof block.timestamp == 'string') ? parseInt(block.timestamp) : block.timestamp;
      let decreaseBlocks = (timestamp - targetTimestamp) / averageBlockTime;

      if (decreaseBlocks < 1) {
        break
      }

      blockNumber -= decreaseBlocks

      block = await this.web3.eth.getBlock(blockNumber);
    }

    // if we undershoot the day
    if (lowerLimitStamp && block.timestamp < lowerLimitStamp) {
      while (block.timestamp < lowerLimitStamp) {
        blockNumber += 1

        block = await this.web3.eth.getBlock(blockNumber);
      }
    }

    if (higherLimitStamp) {
      // if we ended with a block higher than we can
      // walk block by block to find the correct one
      if (block.timestamp >= higherLimitStamp) {
        while (block.timestamp >= higherLimitStamp) {
          blockNumber -= 1;

          block = await this.web3.eth.getBlock(blockNumber);
        }
      }

      // if we ended up with a block lower than the upper limit
      // walk block by block to make sure it's the correct one
      if (block.timestamp < higherLimitStamp) {

        while (block.timestamp < higherLimitStamp) {
          blockNumber += 1;

          if (blockNumber > currentBlockNumber) break;

          const tempBlock = await this.web3.eth.getBlock(blockNumber);

          // can't be equal or higher than upper limit as we want
          // to find the last block before that limit
          if (tempBlock.timestamp >= higherLimitStamp) {
            break;
          }

          block = tempBlock;
        }
      }
    }

    return block.number;
  }
}
