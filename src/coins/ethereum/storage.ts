

import { Transaction } from "../transaction";

export interface TxStorage {
  add(address: string, tx: Transaction);
  list(address: string): Transaction[];
}

export class LocalTxStorage implements TxStorage {
  private prefix: string;

  constructor(prefix: string) {
    this.prefix = prefix;
  }

  add(address: string, tx: Transaction) {
    const txs = this.list(address);
    txs.unshift(tx);
    localStorage.setItem(`${this.prefix}.${address}`, JSON.stringify(txs));
  }

  list(address: string): Transaction[] {
    const data = localStorage.getItem(`${this.prefix}.${address}`);

    if (!data) {
      return [];
    }

    return JSON.parse(data);
  }
}
