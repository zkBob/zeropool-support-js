import { Observable } from 'rxjs';
import { nodeInteraction, broadcast, transfer } from "@waves/waves-transactions";
import { create } from '@waves/node-api-js';

import { Coin } from '../coin';
import { CoinType } from '../coin-type';
import { Config } from './config';
import { Transaction, TxFee, TxStatus } from '../transaction';
import { AccountCache } from './account';

const POLL_INTERVAL = 10 * 60 * 1000;
const TX_LIMIT = 10;

export class WavesCoin extends Coin {
  private config: Config;
  private accounts: AccountCache;
  private api: ReturnType<typeof create>;
  private lastTxTimestamps: number[] = [];

  constructor(mnemonic: string, config: Config) {
    super(mnemonic);
    this.mnemonic = mnemonic;
    this.config = config;
    this.api = create(config.nodeUrl);
    this.accounts = new AccountCache(mnemonic);
  }

  getPrivateKey(account: number): string {
    return this.accounts.getOrCreate(account).privateKey;
  }

  getPublicKey(account: number): string {
    return this.accounts.getOrCreate(account).publicKey;
  }

  getAddress(account: number): string {
    return this.accounts.getOrCreate(account).address;
  }

  async getBalance(account: number): Promise<string> {
    const balance = await nodeInteraction.balance(this.getAddress(account), this.config.nodeUrl);
    return balance.toString();
  }

  async transfer(account: number, to: string, amount: string): Promise<void> {
    const money = {
      recipient: to,
      amount,
    }

    const transferTx = transfer(money, { privateKey: this.getPrivateKey(account) });
    await broadcast(transferTx, this.config.nodeUrl);
  }

  async getTransactions(account: number, limit: number = 10, offset: number = 0): Promise<Transaction[]> {
    const address = this.getAddress(account);
    // TODO: Find a more efficient way to fetch the transaction log with an offset
    let txList = await this.api.transactions.fetchTransactions(address, offset + limit);

    return txList.slice(offset, offset + limit).map((transaction) => {
      const tx = transaction as any; // FIXME: type handling, there are multiple types of tx

      let to, from;
      if (tx.recipient) {
        to = tx.recipient;
        from = tx.sender;
      } else if (tx.sender === address) {
        to = tx.sender;
        from = address;
      } else {
        to = address;
        from = tx.sender;
      }

      return {
        hash: tx.id,
        blockHash: '', // FIXME
        status: TxStatus.Completed, // FIXME: get tx status
        amount: tx.amount,
        from,
        to,
        timestamp: tx.timestamp,
      };
    });
  }

  public async subscribe(account: number): Promise<Observable<Transaction>> {
    const latestTxs = await this.getTransactions(1);

    if (latestTxs.length == 1) {
      this.lastTxTimestamps[account] = latestTxs[0].timestamp;
    }

    return new Observable(subscriber => {
      const interval = setInterval(async () => {
        try {
          const txs = await this.fetchNewTransactions(account, TX_LIMIT, 0);

          for (const tx of txs) {
            subscriber.next(tx);
          }
        } catch (e) {
          subscriber.error(e);
        }
      }, POLL_INTERVAL);

      return function unsubscribe() {
        clearInterval(interval);
      }
    });
  }

  private async fetchNewTransactions(account: number, limit: number, offset: number): Promise<Transaction[]> {
    const txs = await this.getTransactions(account, limit, offset);
    const txIdx = txs.findIndex(tx => tx.timestamp === this.lastTxTimestamps[account]);

    if (txIdx == -1) {
      const otherTxs = await this.fetchNewTransactions(account, limit, offset + limit);
      txs.concat(otherTxs);
      return txs;
    } else if (txIdx > 0) {
      return txs.slice(0, txIdx);
    }

    return [];
  }

  toBaseUnit(amount: string): string {
    return (parseFloat(amount) * 10000000).toString();
  }

  fromBaseUnit(amount: string): string {
    return (parseInt(amount) / 10000000).toString();
  }

  // TODO: Estimate fee for private transactions
  async estimateTxFee(): Promise<TxFee> {
    return {
      gas: '1',
      gasPrice: '100000',
      fee: '100000',
    };
  }

  public getCoinType(): CoinType {
    return CoinType.waves;
  }
}
