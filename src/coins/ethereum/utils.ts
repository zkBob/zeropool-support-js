import { Transaction, TxStatus } from '../transaction';
import { Transaction as NativeTx } from 'web3-core';

export function convertTransaction(tx: NativeTx, timestamp: number, customStatus?: TxStatus): Transaction {
  return {
    status: customStatus || TxStatus.Completed,
    amount: tx.value,
    from: tx.from,
    to: tx.to || '',
    timestamp: timestamp,
    blockHash: tx.blockHash || '',
    hash: tx.hash,
  };
}
