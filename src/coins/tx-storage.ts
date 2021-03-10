import { Transaction } from './transaction';
import { CoinType } from './coin-type';

export interface TxStorage {
  add(coin: CoinType, address: string, tx: Transaction);
  list(coin: CoinType, address: string): Transaction[];
}

export class LocalTxStorage implements TxStorage {
  private prefix: string;

  constructor(prefix: string) {
    this.prefix = prefix;
  }

  add(coin: CoinType, address: string, tx: Transaction) {
    const txs = this.list(coin, address);
    txs.unshift(tx);
    localStorage.setItem(`${this.prefix}.${coin}.${address}`, JSON.stringify(txs));
  }

  list(coin: CoinType, address: string): Transaction[] {
    const data = localStorage.getItem(`${this.prefix}.${coin}.${address}`);

    if (!data) {
      return [];
    }

    return JSON.parse(data);
  }
}
