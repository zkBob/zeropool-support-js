import { Transaction as NativeTx } from 'web3-core';
import { Transaction, TxStatus } from '../transaction';
export declare function convertTransaction(tx: NativeTx, timestamp: number, customStatus?: TxStatus): Transaction;
