import { Transaction, TxStatus } from '../transaction';
import { Transaction as Web3Transaction } from 'web3-core';

export function convertTransaction(tx: Web3Transaction, timestamp: number, customStatus?: TxStatus): Transaction {
  return {
    status: customStatus || TxStatus.Completed,
    amount: tx.value,
    from: tx.from,
    to: tx.to || '',
    timestamp,
  };
}
